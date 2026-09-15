import { NextResponse } from "next/server";
import { getCurrentRep } from "@/lib/auth";
import { changeOwnPassword, RepValidationError } from "@/lib/reps";

export async function POST(req: Request) {
  const rep = await getCurrentRep();
  if (!rep) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

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
    changeOwnPassword({ repId: rep.id, currentPassword, newPassword });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof RepValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
