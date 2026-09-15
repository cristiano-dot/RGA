import { getDb, nextRgaNumber } from "./db";
import { logActivity } from "./activity";

export type LineItemInput = {
  description: string;
  quantity: number;
  price: number;
};

export type LineItemRow = LineItemInput & { id: number; line_no: number; rga_id: number };

export type RgaStatus = "pending" | "approved" | "rejected";

export type RgaRow = {
  id: number;
  rga_number: string | null;
  sales_rep_id: number;
  rep_number: string;
  rep_name: string;
  order_number: string;
  customer_number: string;
  reason: string;
  shipping: number;
  status: RgaStatus;
  created_at: string;
  decided_at: string | null;
  decision_note: string | null;
  admin_last_seen_at: string | null;
  has_new_rep_comment: number;
  item_count: number;
  items_summary: string;
  total_value: number;
};

export function createRga(params: {
  salesRepId: number;
  orderNumber: string;
  customerNumber: string;
  reason: string;
  shipping: number;
  lineItems: LineItemInput[];
  submittedByName: string;
  submittedOnBehalf: boolean;
}): number {
  const db = getDb();
  const insertRga = db.prepare(`
    INSERT INTO rgas (sales_rep_id, order_number, customer_number, reason, shipping, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `);
  const insertItem = db.prepare(`
    INSERT INTO rga_line_items (rga_id, line_no, description, quantity, price)
    VALUES (?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    const info = insertRga.run(
      params.salesRepId,
      params.orderNumber,
      params.customerNumber,
      params.reason,
      params.shipping
    );
    const rgaId = info.lastInsertRowid as number;
    params.lineItems.forEach((item, idx) => {
      insertItem.run(rgaId, idx + 1, item.description, item.quantity, item.price);
    });
    logActivity(db, {
      rgaId,
      type: "submitted",
      actorType: "rep",
      actorName: params.submittedByName,
      message: params.submittedOnBehalf ? "Filed on behalf of the selected rep number." : null,
    });
    return rgaId;
  });

  return tx();
}

const LIST_SELECT = `
  SELECT
    r.id, r.rga_number, r.sales_rep_id, sr.rep_number, sr.name AS rep_name,
    r.order_number, r.customer_number, r.reason, r.shipping, r.status,
    r.created_at, r.decided_at, r.decision_note, r.admin_last_seen_at,
    COUNT(li.id) AS item_count,
    COALESCE(GROUP_CONCAT(li.description, ', ' ORDER BY li.line_no), '') AS items_summary,
    COALESCE(SUM(li.quantity * li.price), 0) + r.shipping AS total_value,
    EXISTS (
      SELECT 1 FROM rga_activity a
      WHERE a.rga_id = r.id AND a.type = 'comment' AND a.actor_type = 'rep'
        AND a.created_at > COALESCE(r.admin_last_seen_at, '0000-01-01T00:00:00.000Z')
    ) AS has_new_rep_comment
  FROM rgas r
  JOIN sales_reps sr ON sr.id = r.sales_rep_id
  LEFT JOIN rga_line_items li ON li.rga_id = r.id
`;

const SORTABLE_COLUMNS: Record<string, string> = {
  created_at: "r.created_at",
  reason: "r.reason",
  status: "r.status",
  item_count: "item_count",
  total_value: "total_value",
  rep_name: "sr.name",
  customer_number: "r.customer_number",
  order_number: "r.order_number",
};

export function listRgasForRep(salesRepId: number): RgaRow[] {
  const db = getDb();
  const sql = `${LIST_SELECT} WHERE r.sales_rep_id = ? GROUP BY r.id ORDER BY r.created_at DESC`;
  return db.prepare(sql).all(salesRepId) as RgaRow[];
}

export function listAllRgas(opts: {
  sort?: string;
  dir?: "asc" | "desc";
  status?: string;
  reason?: string;
}): RgaRow[] {
  const db = getDb();
  const column = SORTABLE_COLUMNS[opts.sort ?? ""] ?? "r.created_at";
  const dir = opts.dir === "asc" ? "ASC" : "DESC";

  const where: string[] = [];
  const args: unknown[] = [];
  if (opts.status && opts.status !== "all") {
    where.push("r.status = ?");
    args.push(opts.status);
  }
  if (opts.reason) {
    where.push("r.reason LIKE ?");
    args.push(`%${opts.reason}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const sql = `${LIST_SELECT} ${whereSql} GROUP BY r.id ORDER BY ${column} ${dir}`;
  return db.prepare(sql).all(...args) as RgaRow[];
}

export function getRgaWithItems(id: number): { rga: RgaRow; items: LineItemRow[] } | null {
  const db = getDb();
  const rga = db
    .prepare(`${LIST_SELECT} WHERE r.id = ? GROUP BY r.id`)
    .get(id) as RgaRow | undefined;
  if (!rga) return null;
  const items = db
    .prepare("SELECT * FROM rga_line_items WHERE rga_id = ? ORDER BY line_no ASC")
    .all(id) as LineItemRow[];
  return { rga, items };
}

export function getRgaForRep(
  id: number,
  salesRepId: number
): { rga: RgaRow; items: LineItemRow[] } | null {
  const result = getRgaWithItems(id);
  if (!result || result.rga.sales_rep_id !== salesRepId) return null;
  return result;
}

export function decideRga(params: {
  rgaId: number;
  adminId: number;
  adminName: string;
  approve: boolean;
  note?: string;
}): { status: RgaStatus; rgaNumber: string | null; salesRepId: number } {
  const db = getDb();

  const tx = db.transaction(() => {
    const current = db
      .prepare("SELECT sales_rep_id, status FROM rgas WHERE id = ?")
      .get(params.rgaId) as { sales_rep_id: number; status: RgaStatus } | undefined;
    if (!current) throw new Error("RGA not found");
    if (current.status !== "pending") throw new Error("RGA already decided");

    let rgaNumber: string | null = null;
    const status: RgaStatus = params.approve ? "approved" : "rejected";

    if (params.approve) {
      rgaNumber = nextRgaNumber(db);
    }

    db.prepare(`
      UPDATE rgas
      SET status = ?, rga_number = ?, decided_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
          decided_by = ?, decision_note = ?
      WHERE id = ?
    `).run(status, rgaNumber, params.adminId, params.note ?? null, params.rgaId);

    const message = params.approve
      ? `Your RGA request has been approved. Return Goods Authorization number: ${rgaNumber}.`
      : `Your RGA request was rejected.${params.note ? ` Reason: ${params.note}` : ""}`;

    db.prepare(`
      INSERT INTO notifications (sales_rep_id, rga_id, message)
      VALUES (?, ?, ?)
    `).run(current.sales_rep_id, params.rgaId, message);

    logActivity(db, {
      rgaId: params.rgaId,
      type: status === "approved" ? "approved" : "rejected",
      actorType: "admin",
      actorName: params.adminName,
      message: params.note ?? null,
    });

    return { status, rgaNumber, salesRepId: current.sales_rep_id };
  });

  return tx();
}
