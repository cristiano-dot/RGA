import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { decideRga } from "@/lib/rga";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const note = typeof body?.note === "string" ? body.note.trim() : undefined;

  try {
    const result = await decideRga({
      rgaId: Number(id),
      adminId: user.id,
      adminName: user.name,
      approve: false,
      note,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
