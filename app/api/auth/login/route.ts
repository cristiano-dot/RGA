import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findRepByEmail } from "@/lib/reps";
import { createRepSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const rep = findRepByEmail(String(email).trim());

  if (!rep || !bcrypt.compareSync(password, rep.password_hash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (!rep.is_active) {
    return NextResponse.json(
      { error: "This account has been deactivated. Contact your admin." },
      { status: 403 }
    );
  }

  await createRepSession(rep.id);
  return NextResponse.json({ ok: true });
}
