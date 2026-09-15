import bcrypt from "bcryptjs";
import { getDb } from "./db";
import type { Role } from "./auth";

export type UserRow = {
  id: number;
  name: string;
  email: string;
  rep_number: string | null;
  is_active: number;
  roles: Role[];
};

export type UserWithPassword = UserRow & { password_hash: string };

export class UserValidationError extends Error {}

function rolesForUser(db: ReturnType<typeof getDb>, userId: number): Role[] {
  const rows = db.prepare("SELECT role FROM user_roles WHERE user_id = ?").all(userId) as {
    role: Role;
  }[];
  return rows.map((r) => r.role);
}

function loadUser(db: ReturnType<typeof getDb>, id: number): UserRow | undefined {
  const row = db
    .prepare("SELECT id, name, email, rep_number, is_active FROM users WHERE id = ?")
    .get(id) as Omit<UserRow, "roles"> | undefined;
  if (!row) return undefined;
  return { ...row, roles: rolesForUser(db, id) };
}

export function listUsers(): UserRow[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT id, name, email, rep_number, is_active FROM users ORDER BY name ASC")
    .all() as Omit<UserRow, "roles">[];
  return rows.map((row) => ({ ...row, roles: rolesForUser(db, row.id) }));
}

export function listActiveReps(): { id: number; rep_number: string; name: string }[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT u.id, u.rep_number, u.name
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'rep'
       WHERE u.is_active = 1
       ORDER BY u.rep_number ASC`
    )
    .all() as { id: number; rep_number: string; name: string }[];
}

export function findUserByEmail(email: string): UserWithPassword | undefined {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, name, email, rep_number, is_active, password_hash FROM users WHERE lower(email) = lower(?)"
    )
    .get(email) as (Omit<UserRow, "roles"> & { password_hash: string }) | undefined;
  if (!row) return undefined;
  return { ...row, roles: rolesForUser(db, row.id) };
}

export function findUserById(id: number): UserRow | undefined {
  return loadUser(getDb(), id);
}

function assertUnique(
  db: ReturnType<typeof getDb>,
  field: "rep_number" | "email",
  value: string,
  excludeId?: number
) {
  const row = db
    .prepare(
      `SELECT id FROM users WHERE lower(${field}) = lower(?) ${excludeId ? "AND id != ?" : ""}`
    )
    .get(...(excludeId ? [value, excludeId] : [value])) as { id: number } | undefined;
  if (row) {
    throw new UserValidationError(
      field === "rep_number" ? "That rep number is already in use." : "That email is already in use."
    );
  }
}

function validateRoles(roles: string[], repNumber: string): Role[] {
  const cleanRoles = Array.from(new Set(roles)).filter(
    (r): r is Role => r === "admin" || r === "rep"
  );
  if (cleanRoles.length === 0) {
    throw new UserValidationError("Select at least one role.");
  }
  if (cleanRoles.includes("rep") && !repNumber.trim()) {
    throw new UserValidationError("Rep number is required for the rep role.");
  }
  return cleanRoles;
}

export function createUser(params: {
  name: string;
  email: string;
  password: string;
  repNumber: string;
  roles: string[];
}): UserRow {
  const db = getDb();
  const name = params.name.trim();
  const email = params.email.trim().toLowerCase();
  const repNumber = params.repNumber.trim();

  if (!name || !email) {
    throw new UserValidationError("Name and email are required.");
  }
  if (params.password.length < 6) {
    throw new UserValidationError("Password must be at least 6 characters.");
  }
  const roles = validateRoles(params.roles, repNumber);

  assertUnique(db, "email", email);
  if (roles.includes("rep")) assertUnique(db, "rep_number", repNumber);

  const hash = bcrypt.hashSync(params.password, 10);

  const tx = db.transaction(() => {
    const info = db
      .prepare(
        "INSERT INTO users (name, email, password_hash, rep_number) VALUES (?, ?, ?, ?)"
      )
      .run(name, email, hash, roles.includes("rep") ? repNumber : null);
    const userId = info.lastInsertRowid as number;
    const insertRole = db.prepare("INSERT INTO user_roles (user_id, role) VALUES (?, ?)");
    roles.forEach((role) => insertRole.run(userId, role));
    return userId;
  });

  const userId = tx();
  return loadUser(db, userId)!;
}

export function updateUser(
  id: number,
  params: { name: string; email: string; repNumber: string; roles: string[] }
): UserRow {
  const db = getDb();
  const name = params.name.trim();
  const email = params.email.trim().toLowerCase();
  const repNumber = params.repNumber.trim();

  if (!name || !email) {
    throw new UserValidationError("Name and email are required.");
  }
  const roles = validateRoles(params.roles, repNumber);

  assertUnique(db, "email", email, id);
  if (roles.includes("rep")) assertUnique(db, "rep_number", repNumber, id);

  const tx = db.transaction(() => {
    db.prepare("UPDATE users SET name = ?, email = ?, rep_number = ? WHERE id = ?").run(
      name,
      email,
      roles.includes("rep") ? repNumber : null,
      id
    );
    db.prepare("DELETE FROM user_roles WHERE user_id = ?").run(id);
    const insertRole = db.prepare("INSERT INTO user_roles (user_id, role) VALUES (?, ?)");
    roles.forEach((role) => insertRole.run(id, role));
  });
  tx();

  return loadUser(db, id)!;
}

export function setUserActive(id: number, isActive: boolean) {
  const db = getDb();
  db.prepare("UPDATE users SET is_active = ? WHERE id = ?").run(isActive ? 1 : 0, id);
}

export function changeOwnPassword(params: {
  userId: number;
  currentPassword: string;
  newPassword: string;
}) {
  const db = getDb();
  const user = db
    .prepare("SELECT password_hash FROM users WHERE id = ?")
    .get(params.userId) as { password_hash: string } | undefined;
  if (!user || !bcrypt.compareSync(params.currentPassword, user.password_hash)) {
    throw new UserValidationError("Current password is incorrect.");
  }
  if (params.newPassword.length < 6) {
    throw new UserValidationError("New password must be at least 6 characters.");
  }
  const hash = bcrypt.hashSync(params.newPassword, 10);
  const tx = db.transaction(() => {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, params.userId);
    // Any reset link that was already in flight is moot now, and shouldn't
    // stay usable by whoever received that email.
    db.prepare(
      "UPDATE password_reset_tokens SET used_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE user_id = ? AND used_at IS NULL"
    ).run(params.userId);
  });
  tx();
}

export function setPasswordHash(userId: number, passwordHash: string) {
  const db = getDb();
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, userId);
}
