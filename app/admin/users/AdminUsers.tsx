"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type CurrentUser = { id: number; name: string; email: string };
type Role = "admin" | "rep";
type UserRow = {
  id: number;
  name: string;
  email: string;
  rep_number: string | null;
  is_active: number;
  roles: Role[];
};

const emptyNewUser = {
  name: "",
  email: "",
  password: "",
  rep_number: "",
  roles: { admin: false, rep: true } as Record<Role, boolean>,
};

function RoleCheckboxes({
  roles,
  onChange,
}: {
  roles: Record<Role, boolean>;
  onChange: (roles: Record<Role, boolean>) => void;
}) {
  return (
    <div className="flex items-center gap-4 text-sm">
      <label className="flex items-center gap-1.5">
        <input
          type="checkbox"
          checked={roles.admin}
          onChange={(e) => onChange({ ...roles, admin: e.target.checked })}
        />
        Admin
      </label>
      <label className="flex items-center gap-1.5">
        <input
          type="checkbox"
          checked={roles.rep}
          onChange={(e) => onChange({ ...roles, rep: e.target.checked })}
        />
        Rep
      </label>
    </div>
  );
}

function RoleBadges({ roles }: { roles: Role[] }) {
  return (
    <div className="flex gap-1.5">
      {roles.map((role) => (
        <span
          key={role}
          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
            role === "admin"
              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
              : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
          }`}
        >
          {role}
        </span>
      ))}
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

export default function AdminUsers({ currentUser }: { currentUser: CurrentUser }) {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [newUser, setNewUser] = useState(emptyNewUser);
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState({
    name: "",
    email: "",
    rep_number: "",
    roles: { admin: false, rep: false } as Record<Role, boolean>,
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [resetMessage, setResetMessage] = useState<{ id: number; text: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => setUsers(data.users ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAdding(true);
    try {
      const roles = Object.entries(newUser.roles)
        .filter(([, checked]) => checked)
        .map(([role]) => role);
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          rep_number: newUser.rep_number,
          roles,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error ?? "Failed to add user.");
        return;
      }
      setNewUser(emptyNewUser);
      load();
    } finally {
      setAdding(false);
    }
  }

  function startEdit(u: UserRow) {
    setEditingId(u.id);
    setEditFields({
      name: u.name,
      email: u.email,
      rep_number: u.rep_number ?? "",
      roles: { admin: u.roles.includes("admin"), rep: u.roles.includes("rep") },
    });
    setEditError(null);
    setResetMessage(null);
  }

  async function saveEdit(id: number) {
    setSavingEdit(true);
    setEditError(null);
    try {
      const roles = Object.entries(editFields.roles)
        .filter(([, checked]) => checked)
        .map(([role]) => role);
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editFields.name,
          email: editFields.email,
          rep_number: editFields.rep_number,
          roles,
        }),
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

  async function toggleActive(u: UserRow) {
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !u.is_active }),
    });
    if (res.ok) load();
  }

  async function sendResetLink(u: UserRow) {
    setResetMessage(null);
    const res = await fetch(`/api/admin/users/${u.id}/reset-password`, { method: "POST" });
    const data = await res.json();
    setResetMessage({
      id: u.id,
      text: data.emailed
        ? `Reset link emailed to ${u.email}.`
        : `Email isn't configured for this deployment — the reset link was logged to the server console instead of sent.`,
    });
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Signed in as {currentUser.name}
          </p>
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
        <h2 className="text-base font-semibold">Add User</h2>
        <form onSubmit={handleAddUser} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            placeholder="Full name"
            value={newUser.name}
            onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))}
            required
          />
          <input
            type="email"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            placeholder="Email"
            value={newUser.email}
            onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
            required
          />
          <input
            type="text"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            placeholder="Initial password"
            value={newUser.password}
            onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
            required
            minLength={6}
          />
          <input
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 disabled:opacity-50"
            placeholder="Rep number (e.g. REP-105)"
            value={newUser.rep_number}
            onChange={(e) => setNewUser((u) => ({ ...u, rep_number: e.target.value }))}
            disabled={!newUser.roles.rep}
          />
          <div className="sm:col-span-2">
            <RoleCheckboxes
              roles={newUser.roles}
              onChange={(roles) => setNewUser((u) => ({ ...u, roles }))}
            />
          </div>
          <div className="sm:col-span-2">
            {addError && <p className="mb-2 text-sm text-red-600">{addError}</p>}
            <button
              type="submit"
              disabled={adding}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {adding ? "Adding..." : "Add User"}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-2 py-3">Email</th>
                <th className="px-2 py-3">Rep #</th>
                <th className="px-2 py-3">Roles</th>
                <th className="px-2 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No users yet.
                  </td>
                </tr>
              )}
              {users.map((u) => {
                const isEditing = editingId === u.id;
                const isSelf = u.id === currentUser.id;
                return (
                  <Fragment key={u.id}>
                    <tr className="border-t border-slate-100 dark:border-slate-800">
                      {isEditing ? (
                        <>
                          <td className="px-4 py-2">
                            <input
                              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
                              value={editFields.name}
                              onChange={(e) =>
                                setEditFields((f) => ({ ...f, name: e.target.value }))
                              }
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="email"
                              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
                              value={editFields.email}
                              onChange={(e) =>
                                setEditFields((f) => ({ ...f, email: e.target.value }))
                              }
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"
                              value={editFields.rep_number}
                              onChange={(e) =>
                                setEditFields((f) => ({ ...f, rep_number: e.target.value }))
                              }
                              disabled={!editFields.roles.rep}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <RoleCheckboxes
                              roles={editFields.roles}
                              onChange={(roles) => setEditFields((f) => ({ ...f, roles }))}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <StatusPill active={!!u.is_active} />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => saveEdit(u.id)}
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
                          <td className="px-4 py-3">{u.name}</td>
                          <td className="px-2 py-3">{u.email}</td>
                          <td className="px-2 py-3 font-mono text-xs">{u.rep_number ?? "—"}</td>
                          <td className="px-2 py-3">
                            <RoleBadges roles={u.roles} />
                          </td>
                          <td className="px-2 py-3">
                            <StatusPill active={!!u.is_active} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => startEdit(u)}
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => sendResetLink(u)}
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                              >
                                Send Reset Link
                              </button>
                              <button
                                onClick={() => toggleActive(u)}
                                disabled={isSelf && !!u.is_active}
                                title={
                                  isSelf && u.is_active
                                    ? "You can't deactivate your own account."
                                    : undefined
                                }
                                className={`rounded-md border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
                                  u.is_active
                                    ? "border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                                    : "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                                }`}
                              >
                                {u.is_active ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                    {isEditing && editError && (
                      <tr>
                        <td
                          colSpan={6}
                          className="bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400"
                        >
                          {editError}
                        </td>
                      </tr>
                    )}
                    {resetMessage?.id === u.id && (
                      <tr>
                        <td
                          colSpan={6}
                          className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300"
                        >
                          {resetMessage.text}
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
