import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { createRepSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const db = getDb();
  const rep = db
    .prepare("SELECT * FROM sales_reps WHERE lower(email) = lower(?)")
    .get(String(email).trim()) as { id: number; password_hash: string } | undefined;

  if (!rep || !bcrypt.compareSync(password, rep.password_hash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await createRepSession(rep.id);
  return NextResponse.json({ ok: true });
}
