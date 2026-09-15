import crypto from "crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";

// Demo-grade signed cookie sessions (HMAC-signed JSON, no external deps).
// For production, swap for a real auth provider / signed JWT library.
//
// What the cookie is worth defending against, and how:
//  - forgery        -> HMAC-SHA256 over the payload, compared in constant time
//  - replay forever -> the issue time is inside the signed payload and checked
//                      server-side, so editing the cookie's own expiry on the
//                      client buys nothing
//  - stale sessions -> the payload carries a fingerprint of the password it
//                      was issued under, so changing or resetting a password
//                      invalidates every session that predates it
// Resolved on first use rather than at import, so a build that never signs
// anything doesn't warn once per worker.
let cachedSecret: string | null = null;

function sessionSecret(): string {
  if (cachedSecret !== null) return cachedSecret;

  const configured = process.env.SESSION_SECRET;
  if (configured) {
    cachedSecret = configured;
  } else if (process.env.NODE_ENV === "production") {
    // A hardcoded fallback in production means anyone who has read this
    // source can mint an admin session. Use a per-process random secret
    // instead: sessions don't survive a restart, which is inconvenient and
    // loud — deliberately, since the fix is one env var away.
    console.error(
      "[auth] SESSION_SECRET is not set. Falling back to a random per-process secret; " +
        "sessions will not survive a restart and will not work across instances. Set SESSION_SECRET."
    );
    cachedSecret = crypto.randomBytes(32).toString("hex");
  } else {
    cachedSecret = "dev-insecure-secret-change-me";
  }

  return cachedSecret;
}

// The __Host- prefix tells the browser to refuse this cookie unless it's
// Secure, path=/ and has no Domain — which blocks a sibling subdomain from
// writing a session cookie for us. It requires HTTPS, so it's production-only.
export const SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-rga_session" : "rga_session";

const MAX_AGE_SEC = 60 * 60 * 8; // 8 hours
const MAX_AGE_MS = MAX_AGE_SEC * 1000;

// id / issued-at / password fingerprint. Short keys keep the cookie small.
type SessionPayload = { id: number; iat: number; pv: string };

/**
 * Fingerprint of the password hash a session was issued under. HMAC'd with
 * the session secret so the cookie never carries a plain hash-of-the-hash.
 */
function passwordVersion(passwordHash: string): string {
  return crypto
    .createHmac("sha256", sessionSecret())
    .update(passwordHash)
    .digest("base64url")
    .slice(0, 16);
}

function sign(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verify(token: string | undefined): SessionPayload | null {
  if (!token) return null;

  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = crypto.createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, so a truncated cookie would
  // otherwise crash every request that reads the session.
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  // A valid signature only proves we issued this string; it still has to be a
  // shape we recognize and still be inside its lifetime.
  if (typeof parsed !== "object" || parsed === null) return null;
  const { id, iat, pv } = parsed as Partial<SessionPayload>;
  if (!Number.isInteger(id) || typeof iat !== "number" || typeof pv !== "string") return null;
  if (iat > Date.now() + 60_000) return null; // clock skew / forged future issue date
  if (Date.now() - iat > MAX_AGE_MS) return null;

  return { id: id as number, iat, pv };
}

export async function createSession(userId: number) {
  const db = getDb();
  const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(userId) as
    | { password_hash: string }
    | undefined;
  if (!row) return;

  const jar = await cookies();
  jar.set(SESSION_COOKIE, sign({ id: userId, iat: Date.now(), pv: passwordVersion(row.password_hash) }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export type Role = "admin" | "rep";

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  rep_number: string | null;
  roles: Role[];
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const payload = verify(jar.get(SESSION_COOKIE)?.value);
  if (!payload) return null;

  const db = getDb();
  const user = db
    .prepare(
      "SELECT id, name, email, rep_number, password_hash FROM users WHERE id = ? AND is_active = 1"
    )
    .get(payload.id) as
    | {
        id: number;
        name: string;
        email: string;
        rep_number: string | null;
        password_hash: string;
      }
    | undefined;
  if (!user) return null;

  // Password changed (or was reset) since this cookie was issued -> stale.
  const currentPv = passwordVersion(user.password_hash);
  const pvBuf = Buffer.from(payload.pv);
  const currentBuf = Buffer.from(currentPv);
  if (pvBuf.length !== currentBuf.length || !crypto.timingSafeEqual(pvBuf, currentBuf)) {
    return null;
  }

  const roles = db
    .prepare("SELECT role FROM user_roles WHERE user_id = ?")
    .all(user.id) as { role: Role }[];

  // Rebuilt field by field so the password hash can't ride along into a
  // response body by accident.
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    rep_number: user.rep_number,
    roles: roles.map((r) => r.role),
  };
}

export function hasRole(user: CurrentUser | null, role: Role): boolean {
  return !!user?.roles.includes(role);
}
