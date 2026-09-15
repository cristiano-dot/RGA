# RGA Portal

A demo web app for requesting and approving Return Goods Authorizations (RGAs).

## What's here

**Sales rep side** (`/login` → `/rep`)
- Sign in with your Google work account (no separate password).
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
- Auth is demo-grade: HTTP-only signed cookies (HMAC), separate sessions for
  reps and admins. Reps authenticate via Google OAuth (see setup below);
  admins use a simple username/password.
- "Notify the rep" is implemented as an in-app notification feed rather than
  real email/SMS — swap in a provider (e.g. Resend, SendGrid, Twilio) behind
  the same `notifications` table when this moves past the demo stage.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

### Setting up Google sign-in for reps

Reps sign in with Google instead of a password. Until you configure it,
`/login` shows a "not configured yet" notice instead of a broken button.

1. In [Google Cloud Console](https://console.cloud.google.com/), create (or
   pick) a project, then go to **APIs & Services → OAuth consent screen** and
   configure it (Internal if you're on Google Workspace and only want your
   org signing in; External + add yourself as a test user otherwise).
2. Go to **APIs & Services → Credentials → Create Credentials → OAuth client
   ID**, type **Web application**.
3. Add an authorized redirect URI:
   - Dev: `http://localhost:3000/api/auth/google/callback`
   - Prod: `https://your-domain.com/api/auth/google/callback`
4. Copy `.env.example` to `.env.local` and fill in the client ID/secret:
   ```bash
   cp .env.example .env.local
   ```
5. (Optional) Set `GOOGLE_WORKSPACE_DOMAIN` (e.g. `smithcorona.com`) to let
   any employee with a Google account on that domain sign in and get
   auto-added as a sales rep on first login — no pre-registration needed. If
   you leave it unset, a Google account can only sign in if its email
   already matches a row in `sales_reps` (an admin would need to add new
   reps directly in the database for now — see Notes below).
6. Restart `npm run dev` after editing `.env.local`.

The seed data already includes `REP-104` for `cristiano@smithcorona.com` (the
email tied to this session) so that account can sign in immediately once
Google OAuth is configured, even without `GOOGLE_WORKSPACE_DOMAIN` set.

### Demo credentials

**Sales reps:** sign in with Google using one of the seeded emails, or set
`GOOGLE_WORKSPACE_DOMAIN` and use any account on that domain:
- `REP-101` — jamie.rivera@example.com
- `REP-102` — alex.chen@example.com
- `REP-103` — morgan.blake@example.com
- `REP-104` — cristiano@smithcorona.com

**Admin:**
- username `admin`, password `admin123`

## Data model

- `sales_reps` — rep number, name, email (Google identity), Google subject id
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

- Add real admin UI for managing the rep roster (add/remove reps, view who's
  been auto-provisioned via `GOOGLE_WORKSPACE_DOMAIN`) instead of editing the
  database directly.
- Wire the notification table up to real email/SMS delivery.
- Give admins an in-app notification feed too — right now they only learn
  about a new rep comment via the unread dot on the request list, not a push
  notification.
- Move from SQLite to a hosted database (Postgres, etc.) for multi-instance
  deployment.
- If you already ran this app before the schema changes (shipping moved off
  line items, rep auth switched from password to Google, new activity/
  comments table), delete the local `data/` folder once so it re-seeds
  cleanly on the new schema.
