import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { createAdminSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  const db = getDb();
  const admin = db
    .prepare("SELECT * FROM admins WHERE username = ?")
    .get(username) as { id: number; password_hash: string } | undefined;

  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  await createAdminSession(admin.id);
  return NextResponse.json({ ok: true });
}
