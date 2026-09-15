import Database from "better-sqlite3";
import { getDb } from "./db";
import { emailUser } from "./notify";

export type ActivityType = "submitted" | "approved" | "rejected" | "comment";
export type ActorType = "rep" | "admin";

export type ActivityRow = {
  id: number;
  rga_id: number;
  type: ActivityType;
  actor_type: ActorType;
  actor_name: string;
  message: string | null;
  created_at: string;
};

export function logActivity(
  db: Database.Database,
  params: {
    rgaId: number;
    type: ActivityType;
    actorType: ActorType;
    actorName: string;
    message?: string | null;
  }
) {
  db.prepare(
    `INSERT INTO rga_activity (rga_id, type, actor_type, actor_name, message)
     VALUES (?, ?, ?, ?, ?)`
  ).run(params.rgaId, params.type, params.actorType, params.actorName, params.message ?? null);
}

export function listActivity(rgaId: number): ActivityRow[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM rga_activity WHERE rga_id = ? ORDER BY created_at ASC")
    .all(rgaId) as ActivityRow[];
}

export async function addComment(params: {
  rgaId: number;
  actorType: ActorType;
  actorName: string;
  message: string;
}) {
  const db = getDb();

  const tx = db.transaction(() => {
    logActivity(db, {
      rgaId: params.rgaId,
      type: "comment",
      actorType: params.actorType,
      actorName: params.actorName,
      message: params.message,
    });

    // A rep comment should surface to the rep in their own notifications too
    // only when the *admin* replies — so notify the rep on admin comments.
    if (params.actorType === "admin") {
      const rga = db
        .prepare("SELECT sales_rep_id, rga_number FROM rgas WHERE id = ?")
        .get(params.rgaId) as { sales_rep_id: number; rga_number: string | null } | undefined;
      if (rga) {
        const label = rga.rga_number ?? `request #${params.rgaId}`;
        const message = `New comment on ${label} from ${params.actorName}: "${params.message}"`;
        db.prepare(
          `INSERT INTO notifications (sales_rep_id, rga_id, message)
           VALUES (?, ?, ?)`
        ).run(rga.sales_rep_id, params.rgaId, message);
        return { notifyUserId: rga.sales_rep_id, label, message };
      }
    }
    return null;
  });

  const toNotify = tx();
  if (toNotify) {
    await emailUser(toNotify.notifyUserId, `New comment on ${toNotify.label}`, toNotify.message);
  }
}

export function markSeenByAdmin(rgaId: number) {
  const db = getDb();
  db.prepare(
    "UPDATE rgas SET admin_last_seen_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?"
  ).run(rgaId);
}
