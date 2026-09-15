# RGA Portal

A demo web app for requesting and approving Return Goods Authorizations (RGAs).

## What's here

**Sales rep side** (`/login` → `/rep`)
- Log in as a sales rep.
- Submit an RGA request: rep number (dropdown), original order number, customer
  number, reason for return (category + details), and one or more line items
  (description, quantity, unit price, shipping).
- See your own submitted requests and their status (pending / approved / rejected).
- In-app notifications tell you when a request is approved (with the assigned
  RGA number) or rejected (with a note).

**Admin side** (`/admin/login` → `/admin`)
- Log in as an admin.
- See every submitted RGA request in a sortable, filterable table (sort by
  date, status, reason, item count, total value, or sales rep; filter by
  status and reason text).
- Open a request to see full line-item detail, then approve (which assigns
  the next RGA number and notifies the rep) or reject (with an optional note).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- SQLite via `better-sqlite3` — zero-setup, file-based, stored at `data/rga.db`
  (gitignored; recreated with demo seed data automatically on first run)
- Auth is demo-grade: HTTP-only signed cookies (HMAC), separate sessions for
  reps and admins. No external auth provider needed to try this out.
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
- `REP-101` — Jamie Rivera
- `REP-102` — Alex Chen
- `REP-103` — Morgan Blake

**Admin:**
- username `admin`, password `admin123`

## Data model

- `sales_reps` — rep number, name, email, password
- `admins` — username, name, password
- `rgas` — order #, customer #, reason, status, RGA number (assigned on
  approval), timestamps
- `rga_line_items` — description, quantity, price, shipping per RGA
- `notifications` — messages sent to a rep when their RGA is decided

## Notes / next steps for a production version

- Swap the demo cookie auth for real authentication (SSO, or a proper
  password/identity provider).
- Wire the notification table up to real email/SMS delivery.
- Add rep account management (self-service password reset, admin-managed
  rep roster) instead of the seeded demo reps.
- Add audit history / comments per RGA for back-and-forth with the rep.
- Move from SQLite to a hosted database (Postgres, etc.) for multi-instance
  deployment.
