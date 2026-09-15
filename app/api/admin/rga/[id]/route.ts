import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { getRgaWithItems } from "@/lib/rga";
import { listActivity, markSeenByAdmin } from "@/lib/activity";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const rgaId = Number(id);
  const result = getRgaWithItems(rgaId);
  if (!result) return NextResponse.json({ error: "Not found." }, { status: 404 });

  markSeenByAdmin(rgaId);
  const activity = listActivity(rgaId);
  return NextResponse.json({ ...result, activity });
}
