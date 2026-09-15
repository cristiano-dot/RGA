import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { decideRga } from "@/lib/rga";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await ctx.params;
  try {
    const result = decideRga({
      rgaId: Number(id),
      adminId: admin.id,
      adminName: admin.name,
      approve: true,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
