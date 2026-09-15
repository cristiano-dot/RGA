import { NextResponse } from "next/server";
import { getCurrentRep } from "@/lib/auth";
import { getRgaForRep } from "@/lib/rga";
import { addComment } from "@/lib/activity";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rep = await getCurrentRep();
  if (!rep) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await ctx.params;
  const rgaId = Number(id);
  const result = getRgaForRep(rgaId, rep.id);
  if (!result) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Comment can't be empty." }, { status: 400 });
  }

  addComment({
    rgaId,
    actorType: "rep",
    actorName: `${rep.name} (${rep.rep_number})`,
    message,
  });

  return NextResponse.json({ ok: true });
}
