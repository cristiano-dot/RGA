# RGA Portal

A demo web app for requesting and approving Return Goods Authorizations (RGAs).

## What's here

**Sales rep side** (`/login` → `/rep`)
- Sign in with email + password.
- Submit an RGA request: rep number (dropdown), original order number, numeric
  customer number, reason for return (category + additional details / lot
  number), one or more line items (description, quantity, unit price), and a
  single shipping amount for the whole return.
- See your own submitted requests and their status (pending / approved / rejected).
- In-app notifications tell you when a request is approved (with the assigned
  RGA number) or rejected (with a note).

**Admin side** (`/admin/login` → `/admin`)
- Log in as an admin (username/password).
- See every submitted RGA request in a sortable, filterable table (sort by
  date, status, reason, item count, total value, or sales rep; filter by
  status and reason text).
- Open a request to see full line-item detail plus the items subtotal,
  shipping, and total, then approve (which assigns the next RGA number and
  notifies the rep) or reject (with an optional note).
- Every request has a History & Comments thread: submission, approval/
  rejection, and free-text comments from either side are shown in one
  timeline, so admin and rep can go back and forth on a request (e.g. "what's
  the lot number?"). A blue dot on the admin list flags requests with an
  unread rep comment; admin replies notify the rep the same way a decision
  does.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- SQLite via `better-sqlite3` — zero-setup, file-based, stored at `data/rga.db`
  (gitignored; recreated with demo seed data automatically on first run)
- Auth is demo-grade: HTTP-only signed cookies (HMAC) + bcrypt-hashed
  passwords, separate sessions for reps and admins. No external auth
  provider or setup needed to try this out.
- "Notify the rep" is implemented as an in-app notification feed rather than
  real email/SMS — swap in a provider (e.g. Resend, SendGrid, Twilio) behind
  the same `notifications` table when this moves past the demo stage.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

### Demo credentials

**Sales reps** (any of these, password `demo123`):
- `REP-101` — jamie.rivera@example.com
- `REP-102` — alex.chen@example.com
- `REP-103` — morgan.blake@example.com
- `REP-104` — cristiano@smithcorona.com

**Admin:**
- username `admin`, password `admin123`

## Data model

- `sales_reps` — rep number, name, email, password
- `admins` — username, name, password
- `rgas` — order #, customer #, reason, shipping, status, RGA number
  (assigned on approval), timestamps
- `rga_line_items` — description, quantity, price per line (shipping lives on
  the parent RGA, not per line)
- `rga_activity` — unified audit trail + comment thread per RGA (submitted /
  approved / rejected system entries, plus free-text comments from rep or
  admin)
- `notifications` — messages sent to a rep when their RGA is decided or an
  admin comments on it

## Notes / next steps for a production version

- Swap the demo password auth for something stronger (SSO, Google OAuth —
  this app had a Google sign-in flow at one point and can go back to it;
  a real identity provider, etc.) when ready. For now it's back to
  email/password so anyone can try it out with zero external setup.
- Wire the notification table up to real email/SMS delivery.
- Give admins an in-app notification feed too — right now they only learn
  about a new rep comment via the unread dot on the request list, not a push
  notification.
- Add rep account management (self-service password reset, admin-managed
  rep roster) instead of the seeded demo reps.
- Move from SQLite to a hosted database (Postgres, etc.) for multi-instance
  deployment.
- If you already ran this app before a schema change (shipping moved off
  line items, rep auth switched between password/Google, new activity/
  comments table), delete the local `data/` folder once so it re-seeds
  cleanly on the current schema.
