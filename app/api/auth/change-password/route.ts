import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
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
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UserValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
