import crypto from "crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";

// Demo-grade signed cookie sessions (HMAC-signed JSON, no external deps).
// For production, swap for a real auth provider / signed JWT library.
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";

export const SESSION_COOKIE = "rga_session";

type SessionPayload = { id: number; issuedAt: number };

function sign(payload: SessionPayload): string {
  const json = JSON.stringify(payload);
  const body = Buffer.from(json).toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verify(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

const MAX_AGE = 60 * 60 * 8; // 8 hours

export async function createSession(userId: number) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sign({ id: userId, issuedAt: Date.now() }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
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
      "SELECT id, name, email, rep_number FROM users WHERE id = ? AND is_active = 1"
    )
    .get(payload.id) as
    | { id: number; name: string; email: string; rep_number: string | null }
    | undefined;
  if (!user) return null;

  const roles = db
    .prepare("SELECT role FROM user_roles WHERE user_id = ?")
    .all(user.id) as { role: Role }[];

  return { ...user, roles: roles.map((r) => r.role) };
}

export function hasRole(user: CurrentUser | null, role: Role): boolean {
  return !!user?.roles.includes(role);
}
