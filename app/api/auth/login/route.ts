import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByEmail } from "@/lib/users";
import { createSession } from "@/lib/auth";
import { clearRateLimit, emailKey, ipKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";

// Two windows: a tight one per account (so a single account can't be ground
// through a password list) and a looser one per IP (so one client can't spray
// many accounts). A successful sign-in clears the account's counter.
const PER_EMAIL = { limit: 8, windowMs: 15 * 60 * 1000 };
const PER_IP = { limit: 30, windowMs: 15 * 60 * 1000 };

// Compared against when the email doesn't exist, so a miss costs the same
// bcrypt work as a hit and the response time doesn't leak which emails are real.
let dummyHash: string | null = null;
function dummyCompare(password: string) {
  dummyHash ??= bcrypt.hashSync("no-such-account", 10);
  bcrypt.compareSync(password, dummyHash);
}

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({ email: "", password: "" }));

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const address = String(email).trim();
  const emailBucket = emailKey("login", address);
  const limit = rateLimit([
    [emailBucket, PER_EMAIL],
    [ipKey("login", req), PER_IP],
  ]);
  if (!limit.allowed) {
    return tooManyRequests(limit, {
      error: `Too many sign-in attempts. Try again in ${limit.retryAfterSec} seconds.`,
    });
  }

  const user = findUserByEmail(address);

  if (!user) {
    dummyCompare(password);
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (!user.is_active) {
    return NextResponse.json(
      { error: "This account has been deactivated. Contact your admin." },
      { status: 403 }
    );
  }

  clearRateLimit(emailBucket);
  await createSession(user.id);
  return NextResponse.json({ ok: true, roles: user.roles });
}
