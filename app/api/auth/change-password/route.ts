import { NextResponse } from "next/server";
import { createSession, getCurrentUser } from "@/lib/auth";
import { changeOwnPassword, UserValidationError } from "@/lib/users";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body?.current_password ?? "");
  const newPassword = String(body?.new_password ?? "");

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current and new password are required." },
      { status: 400 }
    );
  }

  try {
    changeOwnPassword({ userId: user.id, currentPassword, newPassword });
    // Sessions are bound to the password they were issued under, so changing
    // it retires every existing session — including this one. Issue a fresh
    // cookie so the person who just changed their own password stays signed
    // in while anyone else holding an old cookie is kicked out.
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UserValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
