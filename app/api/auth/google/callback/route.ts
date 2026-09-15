import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeGoogleCode, googleWorkspaceDomain } from "@/lib/google-auth";
import { createRepFromGoogle, findRepByEmail, touchRepGoogleSub } from "@/lib/reps";
import { createRepSession } from "@/lib/auth";

const STATE_COOKIE = "google_oauth_state";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const jar = await cookies();
  const expectedState = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);

  if (oauthError) {
    return NextResponse.redirect(new URL("/login?error=google_denied", req.url));
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", req.url));
  }

  try {
    const redirectUri = new URL("/api/auth/google/callback", req.url).toString();
    const claims = await exchangeGoogleCode({ code, redirectUri });

    if (!claims.email_verified) {
      return NextResponse.redirect(new URL("/login?error=unverified_email", req.url));
    }

    let rep = findRepByEmail(claims.email);

    if (rep) {
      touchRepGoogleSub(rep.id, claims.sub);
    } else {
      const workspaceDomain = googleWorkspaceDomain();
      const emailDomain = claims.email.split("@")[1]?.toLowerCase();
      if (workspaceDomain && emailDomain === workspaceDomain) {
        rep = createRepFromGoogle({
          email: claims.email,
          name: claims.name ?? "",
          googleSub: claims.sub,
        });
      } else {
        return NextResponse.redirect(new URL("/login?error=not_registered", req.url));
      }
    }

    await createRepSession(rep.id);
    return NextResponse.redirect(new URL("/rep", req.url));
  } catch (err) {
    console.error("Google sign-in failed", err);
    return NextResponse.redirect(new URL("/login?error=google_failed", req.url));
  }
}
