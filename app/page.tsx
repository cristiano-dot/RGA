import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin, getCurrentRep } from "@/lib/auth";

export default async function Home() {
  const [rep, admin] = await Promise.all([getCurrentRep(), getCurrentAdmin()]);
  if (rep) redirect("/rep");
  if (admin) redirect("/admin");

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">RGA Portal</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Request and manage Return Goods Authorizations.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/login"
            className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Sales Rep Login
          </Link>
          <Link
            href="/admin/login"
            className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}
