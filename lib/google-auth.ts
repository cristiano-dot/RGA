// Minimal, dependency-free Google OAuth 2.0 "Authorization Code" flow.
// We exchange the code server-to-server (authenticated with our client
// secret), so trusting the id_token payload without re-verifying its
// signature is safe here — it never passes through the browser unsigned.

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleWorkspaceDomain(): string | undefined {
  return process.env.GOOGLE_WORKSPACE_DOMAIN?.trim().toLowerCase() || undefined;
}

export function buildGoogleAuthUrl(params: { redirectUri: string; state: string }): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", params.state);
  url.searchParams.set("prompt", "select_account");
  const domain = googleWorkspaceDomain();
  if (domain) url.searchParams.set("hd", domain);
  return url.toString();
}

export type GoogleIdTokenClaims = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  hd?: string;
  aud: string;
  exp: number;
};

function decodeIdToken(idToken: string): GoogleIdTokenClaims {
  const payload = idToken.split(".")[1];
  const json = Buffer.from(payload, "base64url").toString("utf8");
  const claims = JSON.parse(json);
  return {
    ...claims,
    email_verified: claims.email_verified === true || claims.email_verified === "true",
  };
}

export async function exchangeGoogleCode(params: {
  code: string;
  redirectUri: string;
}): Promise<GoogleIdTokenClaims> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: params.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { id_token?: string };
  if (!data.id_token) throw new Error("Google token response missing id_token.");

  const claims = decodeIdToken(data.id_token);
  if (claims.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error("Google id_token audience mismatch.");
  }
  if (claims.exp * 1000 < Date.now()) {
    throw new Error("Google id_token expired.");
  }
  return claims;
}
