"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Rep = { id: number; rep_number: string; name: string };
type RgaListItem = {
  id: number;
  rga_number: string | null;
  order_number: string;
  customer_number: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  item_count: number;
  total_value: number;
};
type NotificationItem = {
  id: number;
  rga_id: number;
  rga_number: string | null;
  message: string;
  is_read: number;
  created_at: string;
};

type LineItem = { description: string; quantity: string; price: string };

const REASON_OPTIONS = [
  "Defective / Damaged",
  "Wrong Item Shipped",
  "Customer Ordered in Error",
  "Sales Entry Error",
  "Overstock / No Longer Needed",
  "Warranty Return",
  "Pricing Error",
  "Other",
];

const emptyLine = (): LineItem => ({ description: "", quantity: "1", price: "" });

function StatusBadge({ status }: { status: RgaListItem["status"] }) {
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

export default function RepDashboard({ rep }: { rep: Rep }) {
  const router = useRouter();
  const [reps, setReps] = useState<Rep[]>([]);
  const [salesRepId, setSalesRepId] = useState<number>(rep.id);
  const [orderNumber, setOrderNumber] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [reasonCategory, setReasonCategory] = useState(REASON_OPTIONS[0]);
  const [reasonDetails, setReasonDetails] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLine()]);
  const [shipping, setShipping] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [myRgas, setMyRgas] = useState<RgaListItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const loadReps = useCallback(() => {
    fetch("/api/reps")
      .then((r) => r.json())
      .then((data) => setReps(data.reps ?? []));
  }, []);

  const loadRgas = useCallback(() => {
    fetch("/api/rga")
      .then((r) => r.json())
      .then((data) => setMyRgas(data.rgas ?? []));
  }, []);

  const loadNotifications = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => setNotifications(data.notifications ?? []));
  }, []);

  useEffect(() => {
    loadReps();
    loadRgas();
    loadNotifications();
  }, [loadReps, loadRgas, loadNotifications]);

  function updateLine(idx: number, patch: Partial<LineItem>) {
    setLineItems((items) => items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addLine() {
    setLineItems((items) => [...items, emptyLine()]);
  }

  function removeLine(idx: number) {
    setLineItems((items) => (items.length > 1 ? items.filter((_, i) => i !== idx) : items));
  }

  const lineTotal = (li: LineItem) => (Number(li.quantity) || 0) * (Number(li.price) || 0);
  const itemsSubtotal = lineItems.reduce((sum, li) => sum + lineTotal(li), 0);
  const grandTotal = itemsSubtotal + (Number(shipping) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    const reason = reasonDetails.trim()
      ? `${reasonCategory}: ${reasonDetails.trim()}`
      : reasonCategory;

    try {
      const res = await fetch("/api/rga", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sales_rep_id: salesRepId,
          order_number: orderNumber,
          customer_number: customerNumber,
          reason,
          shipping: Number(shipping || 0),
          line_items: lineItems.map((li) => ({
            description: li.description,
            quantity: Number(li.quantity),
            price: Number(li.price),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Failed to submit RGA request.");
        return;
      }
      setFormSuccess("RGA request submitted. An admin will review it shortly.");
      setOrderNumber("");
      setCustomerNumber("");
      setReasonCategory(REASON_OPTIONS[0]);
      setReasonDetails("");
      setLineItems([emptyLine()]);
      setShipping("0");
      loadRgas();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function markRead(id: number) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadNotifications();
  }

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">RGA Portal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Signed in as {rep.name} ({rep.rep_number})
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNotifications((s) => !s)}
            className="relative rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900"
          >
            Notifications
            {unread > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white">
                {unread}
              </span>
            )}
          </button>
          <button
            onClick={handleLogout}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900"
          >
            Log out
          </button>
        </div>
      </header>

      {showNotifications && (
        <div className="mb-8 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-800">
            Notifications
          </div>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {notifications.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-slate-500">No notifications yet.</li>
            )}
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`flex items-start justify-between gap-4 px-4 py-3 text-sm ${
                  !n.is_read ? "bg-blue-50 dark:bg-blue-950/30" : ""
                }`}
              >
                <div>
                  <p>{n.message}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    Mark read
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold">New RGA Request</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium">Sales Rep Number</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                value={salesRepId}
                onChange={(e) => setSalesRepId(Number(e.target.value))}
              >
                {reps.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.rep_number} — {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Original Order Number</label>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. SO-58231"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Customer Number</label>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g. 4410"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium">Reason for Return</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value)}
              >
                {REASON_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium">
                Additional Details / Lot Number{" "}
                {reasonCategory === "Other" && <span className="text-red-500">*</span>}
              </label>
              <textarea
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                rows={1}
                value={reasonDetails}
                onChange={(e) => setReasonDetails(e.target.value)}
                required={reasonCategory === "Other"}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">Line Items Being Returned</label>
              <button
                type="button"
                onClick={addLine}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                + Add line item
              </button>
            </div>

            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2 pr-2">Description</th>
                    <th className="w-24 pb-2 pr-2">Qty</th>
                    <th className="w-28 pb-2 pr-2">Unit Price</th>
                    <th className="w-24 pb-2 pr-2">Line Total</th>
                    <th className="w-10 pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li, idx) => (
                    <tr key={idx} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-2 pr-2">
                        <input
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950"
                          value={li.description}
                          onChange={(e) => updateLine(idx, { description: e.target.value })}
                          placeholder="Item / SKU description"
                          required
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950"
                          value={li.quantity}
                          onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                          required
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950"
                          value={li.price}
                          onChange={(e) => updateLine(idx, { price: e.target.value })}
                          placeholder="0.00"
                          required
                        />
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        ${lineTotal(li).toFixed(2)}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          disabled={lineItems.length === 1}
                          className="text-slate-400 hover:text-red-600 disabled:opacity-30"
                          aria-label="Remove line item"
                        >
                          ✕
                        </button>
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
                <label htmlFor="shipping" className="text-slate-500">
                  Shipping
                </label>
                <input
                  id="shipping"
                  type="number"
                  min="0"
                  step="any"
                  className="w-28 rounded-md border border-slate-300 bg-white px-2 py-1 text-right dark:border-slate-700 dark:bg-slate-950"
                  value={shipping}
                  onChange={(e) => setShipping(e.target.value)}
                />
              </div>
              <div className="flex w-56 items-center justify-between border-t border-slate-200 pt-1.5 font-semibold dark:border-slate-800">
                <span>Total</span>
                <span className="tabular-nums">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}
          {formSuccess && <p className="text-sm text-emerald-600">{formSuccess}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {submitting ? "Submitting..." : "Submit RGA Request"}
          </button>
        </form>
      </section>

      <section className="mt-8 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-4 text-base font-semibold dark:border-slate-800">
          My RGA Requests
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-6 py-2">RGA #</th>
                <th className="px-2 py-2">Order #</th>
                <th className="px-2 py-2">Customer #</th>
                <th className="px-2 py-2">Reason</th>
                <th className="px-2 py-2">Items</th>
                <th className="px-2 py-2">Total</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Submitted</th>
                <th className="px-6 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {myRgas.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                    No RGA requests yet.
                  </td>
                </tr>
              )}
              {myRgas.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-6 py-3 font-mono text-xs">{r.rga_number ?? "—"}</td>
                  <td className="px-2 py-3">{r.order_number}</td>
                  <td className="px-2 py-3">{r.customer_number}</td>
                  <td className="max-w-[220px] truncate px-2 py-3" title={r.reason}>
                    {r.reason}
                  </td>
                  <td className="px-2 py-3">{r.item_count}</td>
                  <td className="px-2 py-3 tabular-nums">${r.total_value.toFixed(2)}</td>
                  <td className="px-2 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-2 py-3 text-xs text-slate-500">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Link
                      href={`/rep/${r.id}`}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
