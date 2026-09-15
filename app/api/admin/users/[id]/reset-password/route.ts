import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { findUserById } from "@/lib/users";
import { requestPasswordReset } from "@/lib/password-reset";
import { isEmailConfigured } from "@/lib/email";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const target = findUserById(Number(id));
  if (!target) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const origin = new URL(req.url).origin;
  await requestPasswordReset(target.email, origin);

  return NextResponse.json({ ok: true, emailed: isEmailConfigured() });
}
