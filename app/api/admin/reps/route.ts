import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { createRep, listReps, RepValidationError } from "@/lib/reps";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  return NextResponse.json({ reps: listReps() });
}

export async function POST(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { rep_number, name, email, password } = body ?? {};

  try {
    const rep = createRep({
      repNumber: String(rep_number ?? ""),
      name: String(name ?? ""),
      email: String(email ?? ""),
      password: String(password ?? ""),
    });
    return NextResponse.json({ ok: true, rep });
  } catch (err) {
    if (err instanceof RepValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
