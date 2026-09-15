import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/password-reset";
import { UserValidationError } from "@/lib/users";
import { ipKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";

// Tokens are 32 random bytes, so guessing one isn't realistic — but an
// unthrottled endpoint that does a DB lookup per attempt is still free work
// for an attacker, and this is the endpoint that hands out a session's worth
// of access when it succeeds.
const PER_IP = { limit: 10, windowMs: 15 * 60 * 1000 };

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = String(body?.token ?? "");
  const newPassword = String(body?.new_password ?? "");

  if (!token || !newPassword) {
    return NextResponse.json({ error: "Token and new password are required." }, { status: 400 });
  }

  const limit = rateLimit([[ipKey("reset", req), PER_IP]]);
  if (!limit.allowed) {
    return tooManyRequests(limit, {
      error: `Too many attempts. Try again in ${limit.retryAfterSec} seconds.`,
    });
  }

  try {
    resetPasswordWithToken(token, newPassword);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UserValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
