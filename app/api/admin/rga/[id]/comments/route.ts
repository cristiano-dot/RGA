import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { getRgaWithItems } from "@/lib/rga";
import { addComment } from "@/lib/activity";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await ctx.params;
  const rgaId = Number(id);
  const existing = getRgaWithItems(rgaId);
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Comment can't be empty." }, { status: 400 });
  }

  addComment({
    rgaId,
    actorType: "admin",
    actorName: admin.name,
    message,
  });

  return NextResponse.json({ ok: true });
}
