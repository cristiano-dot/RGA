import { getDb, nextRepNumber } from "./db";

export type SalesRepRow = { id: number; rep_number: string; name: string; email: string };

export function findRepByEmail(email: string): SalesRepRow | undefined {
  const db = getDb();
  return db
    .prepare("SELECT id, rep_number, name, email FROM sales_reps WHERE lower(email) = lower(?)")
    .get(email) as SalesRepRow | undefined;
}

export function createRepFromGoogle(params: {
  email: string;
  name: string;
  googleSub: string;
}): SalesRepRow {
  const db = getDb();
  const repNumber = nextRepNumber(db);
  const displayName = params.name.trim() || params.email.split("@")[0];
  db.prepare(
    "INSERT INTO sales_reps (rep_number, name, email, google_sub) VALUES (?, ?, ?, ?)"
  ).run(repNumber, displayName, params.email.toLowerCase(), params.googleSub);
  return findRepByEmail(params.email)!;
}

export function touchRepGoogleSub(repId: number, googleSub: string) {
  const db = getDb();
  db.prepare("UPDATE sales_reps SET google_sub = ? WHERE id = ?").run(googleSub, repId);
}
