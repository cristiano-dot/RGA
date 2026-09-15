import crypto from "crypto";
import { getDb } from "./db";
import { findUserByEmail, setPasswordHash, UserValidationError } from "./users";
import { emailUser } from "./notify";
import bcrypt from "bcryptjs";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
// Spent/expired tokens are kept briefly so a second click on a used link can
// still say "already used" rather than "invalid", then swept.
const TOKEN_RETENTION_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Always succeeds from the caller's point of view (never reveals whether the
// email exists) — if a matching active user is found, a reset email is sent.
export async function requestPasswordReset(email: string, appOrigin: string) {
  const user = findUserByEmail(email);
  if (!user || !user.is_active) return;

  const db = getDb();
  pruneOldTokens(db);

  // Only one reset link is live at a time: requesting a new one retires any
  // outstanding link for this account, so a link that leaked (forwarded mail,
  // shared inbox, proxy log) stops working as soon as the real owner asks
  // for another.
  db.prepare(
    "UPDATE password_reset_tokens SET used_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE user_id = ? AND used_at IS NULL"
  ).run(user.id);

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  db.prepare(
    "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)"
  ).run(user.id, tokenHash, expiresAt);

  const resetUrl = `${appOrigin}/reset-password?token=${token}`;
  await emailUser(
    user.id,
    "Reset your RGA Portal password",
    `Hi ${user.name},\n\nSomeone (hopefully you) requested a password reset for your RGA Portal account.\n\nReset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`
  );
}

function pruneOldTokens(db: ReturnType<typeof getDb>) {
  const cutoff = new Date(Date.now() - TOKEN_RETENTION_MS).toISOString();
  db.prepare(
    "DELETE FROM password_reset_tokens WHERE (used_at IS NOT NULL AND used_at < ?) OR expires_at < ?"
  ).run(cutoff, cutoff);
}

export function resetPasswordWithToken(token: string, newPassword: string) {
  if (newPassword.length < 6) {
    throw new UserValidationError("New password must be at least 6 characters.");
  }

  const db = getDb();
  const tokenHash = hashToken(token);
  const row = db
    .prepare(
      "SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?"
    )
    .get(tokenHash) as
    | { id: number; user_id: number; expires_at: string; used_at: string | null }
    | undefined;

  if (!row) throw new UserValidationError("That reset link is invalid.");
  if (row.used_at) {
    // A retired link and a spent link are both used_at — but telling someone
    // who never clicked the first one that they "already used" it sends them
    // looking for an account compromise. Check whether a newer link exists.
    const newer = db
      .prepare("SELECT 1 FROM password_reset_tokens WHERE user_id = ? AND id > ?")
      .get(row.user_id, row.id);
    throw new UserValidationError(
      newer
        ? "That link was replaced by a newer reset email. Use the most recent one, or request another."
        : "That reset link has already been used."
    );
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw new UserValidationError("That reset link has expired. Request a new one.");
  }

  const hash = bcrypt.hashSync(newPassword, 10);

  const tx = db.transaction(() => {
    setPasswordHash(row.user_id, hash);
    db.prepare(
      "UPDATE password_reset_tokens SET used_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE user_id = ? AND used_at IS NULL"
    ).run(row.user_id);
  });
  tx();
}
