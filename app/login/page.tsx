"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Rep = { id: number; rep_number: string; name: string };

export default function LoginPage() {
  const router = useRouter();
  const [reps, setReps] = useState<Rep[]>([]);
  const [repNumber, setRepNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/reps")
      .then((r) => r.json())
      .then((data) => {
        setReps(data.reps ?? []);
        if (data.reps?.[0]) setRepNumber(data.reps[0].rep_number);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rep_number: repNumber, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }
      router.push("/rep");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold tracking-tight">Sales Rep Login</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Sign in to submit and track RGA requests.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">Sales Rep Number</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={repNumber}
              onChange={(e) => setRepNumber(e.target.value)}
              required
            >
              {reps.map((rep) => (
                <option key={rep.id} value={rep.rep_number}>
                  {rep.rep_number} — {rep.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 rounded-md bg-slate-100 p-3 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          Demo credentials: any rep number above, password <code>demo123</code>.
        </p>
      </div>
    </div>
  );
}
