import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/password-reset";
import { emailKey, ipKey, rateLimit } from "@/lib/rate-limit";

// Throttled per account and per client: one address can't be mail-bombed with
// reset links, and one client can't walk a list of addresses to see which ones
// exist (by timing, since the response body never differs).
const PER_EMAIL = { limit: 3, windowMs: 15 * 60 * 1000 };
const PER_IP = { limit: 10, windowMs: 15 * 60 * 1000 };

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim();

  if (email) {
    const limit = rateLimit([
      [emailKey("forgot", email), PER_EMAIL],
      [ipKey("forgot", req), PER_IP],
    ]);
    // Throttled requests return the same body as accepted ones — saying "you
    // are being rate limited for this address" would itself confirm the
    // address exists. The status code still tells a well-behaved client to
    // back off.
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: true },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const origin = new URL(req.url).origin;
    // Never reveals whether the email exists — always resolves.
    await requestPasswordReset(email, origin);
  }

  return NextResponse.json({ ok: true });
}
