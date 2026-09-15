"use client";

import Link from "next/link";
import type { LineItemRow, RgaRow } from "@/lib/rga";
import ActivityTimeline, { type ActivityItem } from "@/components/ActivityTimeline";

export default function RepRgaDetail({
  rga,
  items,
  activity,
}: {
  rga: RgaRow;
  items: LineItemRow[];
  activity: ActivityItem[];
}) {
  const itemsSubtotal = items.reduce((sum, i) => sum + i.quantity * i.price, 0);
  const total = itemsSubtotal + rga.shipping;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <Link href="/rep" className="text-sm text-slate-500 hover:underline">
        ← Back to my requests
      </Link>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold">
              {rga.rga_number ? rga.rga_number : `RGA Request #${rga.id}`}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Submitted {new Date(rga.created_at).toLocaleString()} for {rga.rep_number} —{" "}
              {rga.rep_name}
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
                  <th className="py-2 pr-2 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((li) => (
                  <tr key={li.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-2 pr-2">{li.description}</td>
                    <td className="py-2 pr-2">{li.quantity}</td>
                    <td className="py-2 pr-2">${li.price.toFixed(2)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      ${(li.quantity * li.price).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-col items-end gap-1.5 text-sm">
            <div className="flex w-56 items-center justify-between">
              <span className="text-slate-500">Items Subtotal</span>
              <span className="tabular-nums">${itemsSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex w-56 items-center justify-between">
              <span className="text-slate-500">Shipping</span>
              <span className="tabular-nums">${rga.shipping.toFixed(2)}</span>
            </div>
            <div className="flex w-56 items-center justify-between border-t border-slate-200 pt-1.5 font-semibold dark:border-slate-800">
              <span>Total</span>
              <span className="tabular-nums">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {rga.status !== "pending" && (
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

        <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
          <ActivityTimeline activity={activity} postCommentUrl={`/api/rga/${rga.id}/comments`} />
        </div>
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
