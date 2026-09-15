import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/password-reset";
import { UserValidationError } from "@/lib/users";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = String(body?.token ?? "");
  const newPassword = String(body?.new_password ?? "");

  if (!token || !newPassword) {
    return NextResponse.json({ error: "Token and new password are required." }, { status: 400 });
  }

  try {
    resetPasswordWithToken(token, newPassword);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UserValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
