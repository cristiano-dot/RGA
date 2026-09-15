import { getDb } from "./db";

export type NotificationRow = {
  id: number;
  rga_id: number;
  rga_number: string | null;
  message: string;
  is_read: number;
  created_at: string;
};

export function listNotificationsForRep(salesRepId: number): NotificationRow[] {
  const db = getDb();
  return db
    .prepare(`
      SELECT n.id, n.rga_id, r.rga_number, n.message, n.is_read, n.created_at
      FROM notifications n
      JOIN rgas r ON r.id = n.rga_id
      WHERE n.sales_rep_id = ?
      ORDER BY n.created_at DESC
    `)
    .all(salesRepId) as NotificationRow[];
}

export function markNotificationRead(id: number, salesRepId: number) {
  const db = getDb();
  db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND sales_rep_id = ?").run(
    id,
    salesRepId
  );
}

export function unreadCount(salesRepId: number): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) AS c FROM notifications WHERE sales_rep_id = ? AND is_read = 0")
    .get(salesRepId) as { c: number };
  return row.c;
}
