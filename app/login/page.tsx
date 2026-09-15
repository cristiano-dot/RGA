import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentRep } from "@/lib/auth";
import { isGoogleConfigured } from "@/lib/google-auth";

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: "Google sign-in isn't configured yet. Ask your admin to set it up.",
  google_denied: "Google sign-in was cancelled.",
  invalid_state: "That sign-in link expired or is invalid. Please try again.",
  unverified_email: "Your Google email isn't verified. Use a verified work account.",
  not_registered:
    "That Google account isn't set up as a sales rep. Contact your admin to get added.",
  google_failed: "Something went wrong signing in with Google. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const rep = await getCurrentRep();
  if (rep) redirect("/rep");

  const { error } = await searchParams;
  const configured = isGoogleConfigured();

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold tracking-tight">Sales Rep Login</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Sign in with your Google work account to submit and track RGA requests.
        </p>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {ERROR_MESSAGES[error] ?? "Sign-in failed. Please try again."}
          </p>
        )}

        <div className="mt-6">
          {configured ? (
            <a
              href="/api/auth/google"
              className="flex w-full items-center justify-center gap-3 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <GoogleIcon />
              Continue with Google
            </a>
          ) : (
            <p className="rounded-md bg-amber-50 px-3 py-3 text-left text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              Google sign-in isn&apos;t configured yet. Set <code>GOOGLE_CLIENT_ID</code> and{" "}
              <code>GOOGLE_CLIENT_SECRET</code> in your environment (see README) to enable it.
            </p>
          )}
        </div>

        <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
          Admin?{" "}
          <Link href="/admin/login" className="underline">
            Sign in here
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.4C29.7 35.4 27 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.3 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.6 5.4C41.3 36.6 44 30.8 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}
