import { NextResponse } from "next/server";
import crypto from "crypto";
import { buildGoogleAuthUrl, isGoogleConfigured } from "@/lib/google-auth";

const STATE_COOKIE = "google_oauth_state";

export async function GET(req: Request) {
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=not_configured", req.url));
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = new URL("/api/auth/google/callback", req.url).toString();
  const authUrl = buildGoogleAuthUrl({ redirectUri, state });

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 300,
  });
  return res;
}
