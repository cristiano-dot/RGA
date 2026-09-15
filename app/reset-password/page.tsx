import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold tracking-tight">Reset Password</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Choose a new password for your account.
        </p>

        <Suspense fallback={<p className="mt-6 text-sm text-slate-500">Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
