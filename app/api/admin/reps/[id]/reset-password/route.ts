import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { adminResetRepPassword, RepValidationError } from "@/lib/reps";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const password = String(body?.password ?? "");

  try {
    adminResetRepPassword(Number(id), password);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof RepValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
