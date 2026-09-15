import bcrypt from "bcryptjs";
import { getDb } from "./db";

export type SalesRepRow = {
  id: number;
  rep_number: string;
  name: string;
  email: string;
  is_active: number;
};

export function listReps(): SalesRepRow[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, rep_number, name, email, is_active FROM sales_reps ORDER BY rep_number ASC"
    )
    .all() as SalesRepRow[];
}

export function listActiveReps(): Pick<SalesRepRow, "id" | "rep_number" | "name">[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, rep_number, name FROM sales_reps WHERE is_active = 1 ORDER BY rep_number ASC"
    )
    .all() as Pick<SalesRepRow, "id" | "rep_number" | "name">[];
}

export function findRepByEmail(email: string) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM sales_reps WHERE lower(email) = lower(?)")
    .get(email) as
    | { id: number; rep_number: string; name: string; email: string; password_hash: string; is_active: number }
    | undefined;
}

export class RepValidationError extends Error {}

function assertUnique(db: ReturnType<typeof getDb>, field: "rep_number" | "email", value: string, excludeId?: number) {
  const row = db
    .prepare(
      `SELECT id FROM sales_reps WHERE lower(${field}) = lower(?) ${excludeId ? "AND id != ?" : ""}`
    )
    .get(...(excludeId ? [value, excludeId] : [value])) as { id: number } | undefined;
  if (row) {
    throw new RepValidationError(
      field === "rep_number" ? "That rep number is already in use." : "That email is already in use."
    );
  }
}

export function createRep(params: {
  repNumber: string;
  name: string;
  email: string;
  password: string;
}): SalesRepRow {
  const db = getDb();
  const repNumber = params.repNumber.trim();
  const name = params.name.trim();
  const email = params.email.trim().toLowerCase();

  if (!repNumber || !name || !email) {
    throw new RepValidationError("Rep number, name, and email are required.");
  }
  if (params.password.length < 6) {
    throw new RepValidationError("Password must be at least 6 characters.");
  }

  assertUnique(db, "rep_number", repNumber);
  assertUnique(db, "email", email);

  const hash = bcrypt.hashSync(params.password, 10);
  const info = db
    .prepare(
      "INSERT INTO sales_reps (rep_number, name, email, password_hash) VALUES (?, ?, ?, ?)"
    )
    .run(repNumber, name, email, hash);

  return db
    .prepare("SELECT id, rep_number, name, email, is_active FROM sales_reps WHERE id = ?")
    .get(info.lastInsertRowid) as SalesRepRow;
}

export function updateRep(
  id: number,
  params: { repNumber: string; name: string; email: string }
): SalesRepRow {
  const db = getDb();
  const repNumber = params.repNumber.trim();
  const name = params.name.trim();
  const email = params.email.trim().toLowerCase();

  if (!repNumber || !name || !email) {
    throw new RepValidationError("Rep number, name, and email are required.");
  }

  assertUnique(db, "rep_number", repNumber, id);
  assertUnique(db, "email", email, id);

  db.prepare(
    "UPDATE sales_reps SET rep_number = ?, name = ?, email = ? WHERE id = ?"
  ).run(repNumber, name, email, id);

  return db
    .prepare("SELECT id, rep_number, name, email, is_active FROM sales_reps WHERE id = ?")
    .get(id) as SalesRepRow;
}

export function setRepActive(id: number, isActive: boolean) {
  const db = getDb();
  db.prepare("UPDATE sales_reps SET is_active = ? WHERE id = ?").run(isActive ? 1 : 0, id);
}

export function adminResetRepPassword(id: number, newPassword: string) {
  if (newPassword.length < 6) {
    throw new RepValidationError("Password must be at least 6 characters.");
  }
  const db = getDb();
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE sales_reps SET password_hash = ? WHERE id = ?").run(hash, id);
}

export function changeOwnPassword(params: {
  repId: number;
  currentPassword: string;
  newPassword: string;
}) {
  const db = getDb();
  const rep = db
    .prepare("SELECT password_hash FROM sales_reps WHERE id = ?")
    .get(params.repId) as { password_hash: string } | undefined;
  if (!rep || !bcrypt.compareSync(params.currentPassword, rep.password_hash)) {
    throw new RepValidationError("Current password is incorrect.");
  }
  if (params.newPassword.length < 6) {
    throw new RepValidationError("New password must be at least 6 characters.");
  }
  const hash = bcrypt.hashSync(params.newPassword, 10);
  db.prepare("UPDATE sales_reps SET password_hash = ? WHERE id = ?").run(hash, params.repId);
}
