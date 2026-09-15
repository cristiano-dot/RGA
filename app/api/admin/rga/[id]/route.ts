import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { getRgaWithItems } from "@/lib/rga";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await ctx.params;
  const result = getRgaWithItems(Number(id));
  if (!result) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json(result);
}
