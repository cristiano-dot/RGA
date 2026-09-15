import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(user.roles.includes("rep") ? "/rep" : "/admin");

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">RGA Portal</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Request and manage Return Goods Authorizations.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
