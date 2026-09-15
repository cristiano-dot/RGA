import crypto from "crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";

// Demo-grade signed cookie sessions (HMAC-signed JSON, no external deps).
// For production, swap for a real auth provider / signed JWT library.
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";

export const REP_COOKIE = "rga_rep_session";
export const ADMIN_COOKIE = "rga_admin_session";

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

export async function createRepSession(repId: number) {
  const jar = await cookies();
  jar.set(REP_COOKIE, sign({ id: repId, issuedAt: Date.now() }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function createAdminSession(adminId: number) {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, sign({ id: adminId, issuedAt: Date.now() }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearRepSession() {
  const jar = await cookies();
  jar.delete(REP_COOKIE);
}

export async function clearAdminSession() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export type SalesRep = {
  id: number;
  rep_number: string;
  name: string;
  email: string;
};

export type Admin = {
  id: number;
  username: string;
  name: string;
};

export async function getCurrentRep(): Promise<SalesRep | null> {
  const jar = await cookies();
  const payload = verify(jar.get(REP_COOKIE)?.value);
  if (!payload) return null;
  const db = getDb();
  const rep = db
    .prepare("SELECT id, rep_number, name, email FROM sales_reps WHERE id = ? AND is_active = 1")
    .get(payload.id) as SalesRep | undefined;
  return rep ?? null;
}

export async function getCurrentAdmin(): Promise<Admin | null> {
  const jar = await cookies();
  const payload = verify(jar.get(ADMIN_COOKIE)?.value);
  if (!payload) return null;
  const db = getDb();
  const admin = db
    .prepare("SELECT id, username, name FROM admins WHERE id = ?")
    .get(payload.id) as Admin | undefined;
  return admin ?? null;
}
