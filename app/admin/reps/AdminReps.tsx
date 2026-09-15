"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Admin = { id: number; username: string; name: string };
type Rep = {
  id: number;
  rep_number: string;
  name: string;
  email: string;
  is_active: number;
};

const emptyNewRep = { rep_number: "", name: "", email: "", password: "" };

export default function AdminReps({ admin }: { admin: Admin }) {
  const router = useRouter();
  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(false);

  const [newRep, setNewRep] = useState(emptyNewRep);
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState({ rep_number: "", name: "", email: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [resettingId, setResettingId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccessId, setResetSuccessId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/reps")
      .then((r) => r.json())
      .then((data) => setReps(data.reps ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  async function handleAddRep(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAdding(true);
    try {
      const res = await fetch("/api/admin/reps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRep),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error ?? "Failed to add rep.");
        return;
      }
      setNewRep(emptyNewRep);
      load();
    } finally {
      setAdding(false);
    }
  }

  function startEdit(rep: Rep) {
    setEditingId(rep.id);
    setEditFields({ rep_number: rep.rep_number, name: rep.name, email: rep.email });
    setEditError(null);
    setResettingId(null);
  }

  async function saveEdit(id: number) {
    setSavingEdit(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/reps/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFields),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error ?? "Failed to save changes.");
        return;
      }
      setEditingId(null);
      load();
    } finally {
      setSavingEdit(false);
    }
  }

  async function toggleActive(rep: Rep) {
    await fetch(`/api/admin/reps/${rep.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !rep.is_active }),
    });
    load();
  }

  function startReset(id: number) {
    setResettingId(id);
    setResetPassword("");
    setResetError(null);
    setResetSuccessId(null);
    setEditingId(null);
  }

  async function submitReset(id: number) {
    setResetError(null);
    try {
      const res = await fetch(`/api/admin/reps/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResetError(data.error ?? "Failed to reset password.");
        return;
      }
      setResettingId(null);
      setResetSuccessId(id);
    } catch {
      setResetError("Failed to reset password.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Sales Reps</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Signed in as {admin.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900"
          >
            ← Back to requests
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900"
          >
            Log out
          </button>
        </div>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold">Add Sales Rep</h2>
        <form onSubmit={handleAddRep} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            placeholder="Rep number (e.g. REP-105)"
            value={newRep.rep_number}
            onChange={(e) => setNewRep((r) => ({ ...r, rep_number: e.target.value }))}
            required
          />
          <input
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            placeholder="Full name"
            value={newRep.name}
            onChange={(e) => setNewRep((r) => ({ ...r, name: e.target.value }))}
            required
          />
          <input
            type="email"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            placeholder="Email"
            value={newRep.email}
            onChange={(e) => setNewRep((r) => ({ ...r, email: e.target.value }))}
            required
          />
          <input
            type="text"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            placeholder="Initial password"
            value={newRep.password}
            onChange={(e) => setNewRep((r) => ({ ...r, password: e.target.value }))}
            required
            minLength={6}
          />
          <div className="sm:col-span-4">
            {addError && <p className="mb-2 text-sm text-red-600">{addError}</p>}
            <button
              type="submit"
              disabled={adding}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {adding ? "Adding..." : "Add Rep"}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Rep #</th>
                <th className="px-2 py-3">Name</th>
                <th className="px-2 py-3">Email</th>
                <th className="px-2 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {!loading && reps.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No sales reps yet.
                  </td>
                </tr>
              )}
              {reps.map((rep) => {
                const isEditing = editingId === rep.id;
                const isResetting = resettingId === rep.id;
                return (
                  <Fragment key={rep.id}>
                    <tr className="border-t border-slate-100 dark:border-slate-800">
                      {isEditing ? (
                        <>
                          <td className="px-4 py-2">
                            <input
                              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
                              value={editFields.rep_number}
                              onChange={(e) =>
                                setEditFields((f) => ({ ...f, rep_number: e.target.value }))
                              }
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
                              value={editFields.name}
                              onChange={(e) => setEditFields((f) => ({ ...f, name: e.target.value }))}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="email"
                              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
                              value={editFields.email}
                              onChange={(e) => setEditFields((f) => ({ ...f, email: e.target.value }))}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <StatusPill active={!!rep.is_active} />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => saveEdit(rep.id)}
                                disabled={savingEdit}
                                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                              >
                                {savingEdit ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-mono text-xs">{rep.rep_number}</td>
                          <td className="px-2 py-3">{rep.name}</td>
                          <td className="px-2 py-3">{rep.email}</td>
                          <td className="px-2 py-3">
                            <StatusPill active={!!rep.is_active} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => startEdit(rep)}
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => startReset(rep.id)}
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                              >
                                Reset Password
                              </button>
                              <button
                                onClick={() => toggleActive(rep)}
                                className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                                  rep.is_active
                                    ? "border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                                    : "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                                }`}
                              >
                                {rep.is_active ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                    {isEditing && editError && (
                      <tr>
                        <td colSpan={5} className="bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
                          {editError}
                        </td>
                      </tr>
                    )}
                    {isResetting && (
                      <tr>
                        <td colSpan={5} className="border-t border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-slate-500">
                              New password for {rep.name}:
                            </span>
                            <input
                              type="text"
                              className="w-48 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950"
                              value={resetPassword}
                              onChange={(e) => setResetPassword(e.target.value)}
                              minLength={6}
                              placeholder="min 6 characters"
                            />
                            <button
                              onClick={() => submitReset(rep.id)}
                              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                            >
                              Set Password
                            </button>
                            <button
                              onClick={() => setResettingId(null)}
                              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                            >
                              Cancel
                            </button>
                            {resetError && <span className="text-sm text-red-600">{resetError}</span>}
                          </div>
                        </td>
                      </tr>
                    )}
                    {resetSuccessId === rep.id && (
                      <tr>
                        <td colSpan={5} className="border-t border-slate-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:border-slate-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                          Password updated. Share the new password with {rep.name} directly.
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
          : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}
