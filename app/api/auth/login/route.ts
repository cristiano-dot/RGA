import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByEmail } from "@/lib/users";
import { createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = findUserByEmail(String(email).trim());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (!user.is_active) {
    return NextResponse.json(
      { error: "This account has been deactivated. Contact your admin." },
      { status: 403 }
    );
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true, roles: user.roles });
}
