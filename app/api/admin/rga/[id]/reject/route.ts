import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { decideRga } from "@/lib/rga";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const note = typeof body?.note === "string" ? body.note.trim() : undefined;

  try {
    const result = decideRga({
      rgaId: Number(id),
      adminId: admin.id,
      adminName: admin.name,
      approve: false,
      note,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
