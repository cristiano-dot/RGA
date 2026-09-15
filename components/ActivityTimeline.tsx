"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ActivityItem = {
  id: number;
  type: "submitted" | "approved" | "rejected" | "comment";
  actor_type: "rep" | "admin";
  actor_name: string;
  message: string | null;
  created_at: string;
};

function describeSystemEvent(a: ActivityItem): string {
  switch (a.type) {
    case "submitted":
      return `${a.actor_name} submitted this request.`;
    case "approved":
      return `${a.actor_name} approved this request.`;
    case "rejected":
      return `${a.actor_name} rejected this request.`;
    default:
      return "";
  }
}

export default function ActivityTimeline({
  activity,
  postCommentUrl,
}: {
  activity: ActivityItem[];
  postCommentUrl: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(postCommentUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to post comment.");
        return;
      }
      setMessage("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold">History &amp; Comments</h2>
      <ul className="mt-3 space-y-3">
        {activity.length === 0 && <li className="text-sm text-slate-500">No activity yet.</li>}
        {activity.map((a) =>
          a.type === "comment" ? (
            <li
              key={a.id}
              className={`rounded-md border px-3 py-2 text-sm ${
                a.actor_type === "admin"
                  ? "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50"
                  : "border-blue-100 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{a.actor_name}</span>
                <span className="text-xs text-slate-500">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap">{a.message}</p>
            </li>
          ) : (
            <li key={a.id} className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  a.type === "approved"
                    ? "bg-emerald-500"
                    : a.type === "rejected"
                      ? "bg-red-500"
                      : "bg-slate-400"
                }`}
              />
              <span>{describeSystemEvent(a)}</span>
              <span className="text-xs">— {new Date(a.created_at).toLocaleString()}</span>
              {a.message && <span className="italic">&ldquo;{a.message}&rdquo;</span>}
            </li>
          )
        )}
      </ul>

      <form onSubmit={submitComment} className="mt-4 space-y-2">
        <textarea
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          rows={2}
          placeholder="Add a comment..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !message.trim()}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {submitting ? "Posting..." : "Post Comment"}
        </button>
      </form>
    </div>
  );
}
