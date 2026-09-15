import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { RepValidationError, setRepActive, updateRep } from "@/lib/reps";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await ctx.params;
  const repId = Number(id);
  const body = await req.json().catch(() => ({}));

  try {
    if (typeof body?.is_active === "boolean") {
      setRepActive(repId, body.is_active);
    }

    if (body?.rep_number !== undefined || body?.name !== undefined || body?.email !== undefined) {
      const rep = updateRep(repId, {
        repNumber: String(body.rep_number ?? ""),
        name: String(body.name ?? ""),
        email: String(body.email ?? ""),
      });
      return NextResponse.json({ ok: true, rep });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof RepValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
