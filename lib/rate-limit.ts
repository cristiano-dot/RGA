// Small in-memory rate limiter for the auth endpoints (login, forgot
// password, reset password). Sliding window, no dependencies.
//
// Scope: this lives in the process's memory, which matches the rest of this
// demo (a single `next dev` / `next start` process on top of a local SQLite
// file). A multi-instance deployment needs a shared store — Redis, or a
// table in the same database the app already uses — but the call sites below
// don't change, only this module's internals.

export type RateLimitRule = {
  /** Max allowed hits inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the caller may retry — 0 when allowed. */
  retryAfterSec: number;
};

const ALLOWED: RateLimitResult = { allowed: true, retryAfterSec: 0 };

// key -> hit timestamps (ms), oldest first.
const hits = new Map<string, number[]>();

// Cheap amortized cleanup so a long-running process doesn't accumulate a
// bucket per attempted email address forever.
const SWEEP_EVERY_MS = 5 * 60 * 1000;
let lastSweep = Date.now();

function sweep(now: number, maxWindowMs: number) {
  if (now - lastSweep < SWEEP_EVERY_MS) return;
  lastSweep = now;
  const cutoff = now - Math.max(maxWindowMs, SWEEP_EVERY_MS);
  for (const [key, times] of hits) {
    if (times.length === 0 || times[times.length - 1] < cutoff) hits.delete(key);
  }
}

function fresh(key: string, now: number, windowMs: number): number[] {
  const times = hits.get(key) ?? [];
  const cutoff = now - windowMs;
  // Timestamps are appended in order, so dropping the expired prefix is enough.
  let i = 0;
  while (i < times.length && times[i] <= cutoff) i++;
  const kept = i === 0 ? times : times.slice(i);
  hits.set(key, kept);
  return kept;
}

function retryAfter(times: number[], now: number, windowMs: number): number {
  const oldest = times[0];
  return Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
}

/**
 * Check every rule and record a hit against all of them — but only if all of
 * them pass. A blocked request doesn't count as a hit, so a client hammering
 * a throttled endpoint can't push its own cooldown further out.
 */
export function rateLimit(entries: Array<[key: string, rule: RateLimitRule]>): RateLimitResult {
  const now = Date.now();
  sweep(now, Math.max(...entries.map(([, rule]) => rule.windowMs)));

  let blockedFor = 0;
  const buckets: Array<[string, number[]]> = [];

  for (const [key, rule] of entries) {
    const times = fresh(key, now, rule.windowMs);
    if (times.length >= rule.limit) {
      blockedFor = Math.max(blockedFor, retryAfter(times, now, rule.windowMs));
    }
    buckets.push([key, times]);
  }

  if (blockedFor > 0) return { allowed: false, retryAfterSec: blockedFor };

  for (const [key, times] of buckets) {
    times.push(now);
    hits.set(key, times);
  }
  return ALLOWED;
}

/** Forget a key's history — e.g. after a successful login. */
export function clearRateLimit(...keys: string[]) {
  for (const key of keys) hits.delete(key);
}

/**
 * Best-effort client IP. Behind a proxy this is only as trustworthy as the
 * proxy that sets the header; a public deployment should pin this to the
 * specific hop it trusts rather than taking the first value on faith.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Normalizes an email into a stable bucket key (same casing/whitespace rules as login). */
export function emailKey(prefix: string, email: string): string {
  return `${prefix}:email:${email.trim().toLowerCase()}`;
}

export function ipKey(prefix: string, req: Request): string {
  return `${prefix}:ip:${clientIp(req)}`;
}

export function tooManyRequests(result: RateLimitResult, body: Record<string, unknown>) {
  return Response.json(body, {
    status: 429,
    headers: { "Retry-After": String(result.retryAfterSec) },
  });
}
