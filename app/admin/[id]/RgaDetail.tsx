"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LineItemRow, RgaRow } from "@/lib/rga";

export default function RgaDetail({ rga, items }: { rga: RgaRow; items: LineItemRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/rga/${rga.id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to approve.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/rga/${rga.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: rejectNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to reject.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const total = items.reduce((sum, i) => sum + i.quantity * i.price + i.shipping, 0);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <Link href="/admin" className="text-sm text-slate-500 hover:underline">
        ← Back to all requests
      </Link>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold">
              {rga.rga_number ? rga.rga_number : `RGA Request #${rga.id}`}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Submitted {new Date(rga.created_at).toLocaleString()} by {rga.rep_number} — {rga.rep_name}
            </p>
          </div>
          <StatusBadge status={rga.status} />
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Order #</dt>
            <dd className="mt-0.5">{rga.order_number}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Customer #</dt>
            <dd className="mt-0.5">{rga.customer_number}</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-xs uppercase tracking-wide text-slate-500">Reason</dt>
            <dd className="mt-0.5">{rga.reason}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <h2 className="text-sm font-semibold">Line Items</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-2">Description</th>
                  <th className="py-2 pr-2">Qty</th>
                  <th className="py-2 pr-2">Unit Price</th>
                  <th className="py-2 pr-2">Shipping</th>
                  <th className="py-2 pr-2 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((li) => (
                  <tr key={li.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-2 pr-2">{li.description}</td>
                    <td className="py-2 pr-2">{li.quantity}</td>
                    <td className="py-2 pr-2">${li.price.toFixed(2)}</td>
                    <td className="py-2 pr-2">${li.shipping.toFixed(2)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      ${(li.quantity * li.price + li.shipping).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="pt-2 text-right text-sm font-medium">
                    Total
                  </td>
                  <td className="pt-2 text-right text-sm font-semibold tabular-nums">
                    ${total.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {rga.status === "pending" ? (
          <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            {!showRejectBox ? (
              <div className="flex gap-3">
                <button
                  onClick={approve}
                  disabled={busy}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
                >
                  {busy ? "Working..." : "Approve & Issue RGA #"}
                </button>
                <button
                  onClick={() => setShowRejectBox(true)}
                  disabled={busy}
                  className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  Reject
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm font-medium">Reason for rejection (optional)</label>
                <textarea
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  rows={2}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                />
                <div className="flex gap-3">
                  <button
                    onClick={reject}
                    disabled={busy}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-60"
                  >
                    {busy ? "Working..." : "Confirm Rejection"}
                  </button>
                  <button
                    onClick={() => setShowRejectBox(false)}
                    disabled={busy}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-8 border-t border-slate-200 pt-6 text-sm dark:border-slate-800">
            <p>
              Decided {rga.decided_at ? new Date(rga.decided_at).toLocaleString() : ""}
              {rga.status === "approved" && rga.rga_number && (
                <>
                  {" "}
                  — RGA number <span className="font-mono">{rga.rga_number}</span> issued.
                </>
              )}
            </p>
            {rga.decision_note && <p className="mt-1 text-slate-500">Note: {rga.decision_note}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

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
