import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/password-reset";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim();

  if (email) {
    const origin = new URL(req.url).origin;
    // Never reveals whether the email exists — always resolves.
    await requestPasswordReset(email, origin);
  }

  return NextResponse.json({ ok: true });
}
