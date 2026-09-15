"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Admin = { id: number; username: string; name: string };
type RgaRow = {
  id: number;
  rga_number: string | null;
  rep_number: string;
  rep_name: string;
  order_number: string;
  customer_number: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  item_count: number;
  total_value: number;
};

const SORT_COLUMNS: { key: string; label: string }[] = [
  { key: "created_at", label: "Submitted" },
  { key: "status", label: "Status" },
  { key: "reason", label: "Reason" },
  { key: "item_count", label: "Items" },
  { key: "total_value", label: "Total" },
  { key: "rep_name", label: "Sales Rep" },
];

function StatusBadge({ status }: { status: RgaRow["status"] }) {
  const styles = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function AdminDashboard({ admin }: { admin: Admin }) {
  const router = useRouter();
  const [rgas, setRgas] = useState<RgaRow[]>([]);
  const [sort, setSort] = useState("created_at");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [status, setStatus] = useState("all");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ sort, dir, status, reason });
    fetch(`/api/admin/rga?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setRgas(data.rgas ?? []))
      .finally(() => setLoading(false));
  }, [sort, dir, status, reason]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleSort(key: string) {
    if (sort === key) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setDir("desc");
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const pendingCount = rgas.filter((r) => r.status === "pending").length;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">RGA Admin</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Signed in as {admin.name}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900"
        >
          Log out
        </button>
      </header>

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Status
          </label>
          <select
            className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All ({rgas.length})</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Reason contains
          </label>
          <input
            className="mt-1 w-56 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Damaged"
          />
        </div>
        {pendingCount > 0 && status === "all" && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            {pendingCount} pending review
          </span>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">RGA #</th>
                <th className="px-2 py-3">Order #</th>
                <th className="px-2 py-3">Customer #</th>
                {SORT_COLUMNS.map((col) => (
                  <th key={col.key} className="px-2 py-3">
                    <button
                      onClick={() => toggleSort(col.key)}
                      className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      {col.label}
                      {sort === col.key && <span>{dir === "asc" ? "▲" : "▼"}</span>}
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {!loading && rgas.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    No RGA requests match these filters.
                  </td>
                </tr>
              )}
              {rgas.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3 font-mono text-xs">{r.rga_number ?? "—"}</td>
                  <td className="px-2 py-3">{r.order_number}</td>
                  <td className="px-2 py-3">{r.customer_number}</td>
                  <td className="px-2 py-3 text-xs text-slate-500">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-2 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="max-w-[200px] truncate px-2 py-3" title={r.reason}>
                    {r.reason}
                  </td>
                  <td className="px-2 py-3">{r.item_count}</td>
                  <td className="px-2 py-3 tabular-nums">${r.total_value.toFixed(2)}</td>
                  <td className="px-2 py-3">
                    {r.rep_number} — {r.rep_name}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/${r.id}`}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
