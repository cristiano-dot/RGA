import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { createRepSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { rep_number, password } = await req.json();

  if (!rep_number || !password) {
    return NextResponse.json({ error: "Rep number and password are required." }, { status: 400 });
  }

  const db = getDb();
  const rep = db
    .prepare("SELECT * FROM sales_reps WHERE rep_number = ?")
    .get(rep_number) as { id: number; password_hash: string } | undefined;

  if (!rep || !bcrypt.compareSync(password, rep.password_hash)) {
    return NextResponse.json({ error: "Invalid rep number or password." }, { status: 401 });
  }

  await createRepSession(rep.id);
  return NextResponse.json({ ok: true });
}
