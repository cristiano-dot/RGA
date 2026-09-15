# RGA Portal

A demo web app for requesting and approving Return Goods Authorizations (RGAs).

## What's here

**One account, one login, one or more roles.** There's a single `/login` for
everyone — admin and rep are roles on the same `users` table, not separate
account systems. Someone with only the rep role lands on `/rep`; admin-only
lands on `/admin`; someone with both roles lands on `/rep` by default and
gets an "Admin Mode" button to switch over — same session, no second login.

**Sales rep side** (`/rep`)
- Submit an RGA request: rep number (dropdown, active reps only), original
  order number, numeric customer number, reason for return (category +
  additional details / lot number), one or more line items (description,
  quantity, unit price), and a single shipping amount for the whole return.
- See your own submitted requests and their status (pending / approved /
  rejected), and open one to read/post comments with the admin.
- In-app notifications *and* real emails tell you when a request is approved
  (with the assigned RGA number) or rejected (with a note), or when an admin
  comments on your request.
- Change your own password any time from the dashboard (current + new
  password), or use "Forgot password?" on the login page for an emailed
  reset link if you don't remember it.

**Admin side** (`/admin`)
- See every submitted RGA request in a sortable, filterable table — including
  an "Items Returned" column listing the line-item descriptions
  (comma-separated when there's more than one) — sortable by date, status,
  reason, item count, total value, or sales rep, and filterable by status and
  reason text.
- Open a request to see full line-item detail plus the items subtotal,
  shipping, and total, then approve (which assigns the next RGA number and
  notifies the rep by email + in-app) or reject (with an optional note).
- Every request has a History & Comments thread: submission, approval/
  rejection, and free-text comments from either side, all in one timeline. A
  blue dot on the admin list flags requests with an unread rep comment;
  admin replies email the rep the same way a decision does.
- "Manage Users" is the full account roster: add a user (name, email,
  initial password, rep number if they hold the rep role, and role
  checkboxes), edit their info or roles, send them a password-reset email,
  or activate/deactivate them (deactivated users can't log in and reps drop
  out of the rep dropdown on new requests, but their past RGAs are
  untouched). You can't deactivate your own account.
- A "Rep Mode" button switches over to `/rep` for anyone who also holds the
  rep role.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- SQLite via `better-sqlite3` — zero-setup, file-based, stored at `data/rga.db`
  (gitignored; recreated with demo seed data automatically on first run)
- Auth is demo-grade: one HTTP-only signed session cookie (HMAC) +
  bcrypt-hashed passwords, roles stored per-user rather than per-login-system.
  No external auth provider needed to try this out.
- Email is sent via the [Resend](https://resend.com) HTTP API (no SDK, just
  `fetch`) when `RESEND_API_KEY` is set. Without it, every email the app
  would send — RGA decisions, admin comments, password resets — is logged to
  the server console instead, clearly marked `[email:not-configured]`, so the
  app is fully usable without setting anything up. See **Setting up email**
  below.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

### Setting up email (optional)

Without any setup, every email is logged to the terminal running `npm run
dev` instead of actually sending — including password-reset links, so you
can still test that flow locally by copying the link out of the console.

To send real email:

1. Sign up at [resend.com](https://resend.com) and create an API key.
2. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
3. Set `RESEND_API_KEY` in `.env.local`. Optionally set `EMAIL_FROM` (e.g.
   `RGA Portal <notifications@yourdomain.com>`) once you've verified a
   sending domain in Resend — until then, Resend's shared
   `onboarding@resend.dev` sender works for testing.
4. Restart `npm run dev`.

Swapping in a different provider (SendGrid, Postmark, SES, SMTP via
nodemailer) only touches `lib/email.ts` — nothing else in the app knows or
cares which provider is behind `sendEmail()`.

### Demo credentials

- **Rep only** — jamie.rivera@example.com / demo123 (REP-101)
- **Rep only** — alex.chen@example.com / demo123 (REP-102)
- **Rep only** — morgan.blake@example.com / demo123 (REP-103)
- **Admin only** — admin@example.com / admin123
- **Both roles** — cristiano@smithcorona.com / demo123 (REP-104) — use this
  one to try the Admin Mode / Rep Mode switch with a single login

## Data model

- `users` — name, email, password, optional rep number, active flag
- `user_roles` — (user_id, role) pairs; role is `admin` or `rep`
- `password_reset_tokens` — single-use, 1-hour-expiry tokens for the
  forgot-password email flow (hashed at rest)
- `rgas` — order #, customer #, reason, shipping, status, RGA number
  (assigned on approval), timestamps; `sales_rep_id` and `decided_by`
  reference `users`
- `rga_line_items` — description, quantity, price per line (shipping lives on
  the parent RGA, not per line)
- `rga_activity` — unified audit trail + comment thread per RGA (submitted /
  approved / rejected system entries, plus free-text comments from rep or
  admin)
- `notifications` — in-app messages shown to a rep when their RGA is decided
  or an admin comments on it (mirrored by an email — see Stack above)

## Notes / next steps for a production version

- Swap the demo password auth for something stronger (SSO, Google OAuth —
  this app had a Google sign-in flow at one point and can go back to it; a
  real identity provider, etc.).
- Give admins an in-app notification feed too — right now they only learn
  about a new rep comment via the unread dot on the request list, not a push
  notification or email.
- Move from SQLite to a hosted database (Postgres, etc.) for multi-instance
  deployment.
- Add rate limiting to the forgot-password endpoint (it's fine for a demo,
  but a public deployment should throttle repeated requests per email/IP).
- If you already ran this app before a schema change (shipping moved off
  line items; separate admins/sales_reps tables merged into users +
  user_roles; the activity/comments table; password_reset_tokens), delete
  the local `data/` folder once so it re-seeds cleanly on the current schema.
