import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { findUserById } from "@/lib/users";
import { requestPasswordReset } from "@/lib/password-reset";
import { isEmailConfigured } from "@/lib/email";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

// Authenticated and admin-only, so this is about containing an accident (or a
// compromised admin account) rather than an anonymous attacker: no admin needs
// to fire off more than a handful of reset emails in a quarter of an hour.
const PER_ADMIN = { limit: 20, windowMs: 15 * 60 * 1000 };

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const limit = rateLimit([[`admin-reset:user:${user.id}`, PER_ADMIN]]);
  if (!limit.allowed) {
    return tooManyRequests(limit, {
      error: `Too many reset emails sent. Try again in ${limit.retryAfterSec} seconds.`,
    });
  }

  const { id } = await ctx.params;
  const target = findUserById(Number(id));
  if (!target) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const origin = new URL(req.url).origin;
  await requestPasswordReset(target.email, origin);

  return NextResponse.json({ ok: true, emailed: isEmailConfigured() });
}
