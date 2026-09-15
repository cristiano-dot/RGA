import { NextResponse } from "next/server";
import { getCurrentRep } from "@/lib/auth";
import { getRgaForRep } from "@/lib/rga";
import { listActivity } from "@/lib/activity";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rep = await getCurrentRep();
  if (!rep) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await ctx.params;
  const result = getRgaForRep(Number(id), rep.id);
  if (!result) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const activity = listActivity(Number(id));
  return NextResponse.json({ ...result, activity });
}
