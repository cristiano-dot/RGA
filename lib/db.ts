import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

const DB_PATH = path.join(process.cwd(), "data", "rga.db");

// better-sqlite3 is synchronous; a single cached connection is safe for this
// demo's dev-server / single-process usage.
declare global {
  // eslint-disable-next-line no-var
  var __rgaDb: Database.Database | undefined;
}

function createConnection(): Database.Database {
  const fs = require("fs") as typeof import("fs");
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    -- One account, one or more roles (see user_roles). A user with the
    -- 'rep' role has a rep_number; a user with only 'admin' does not.
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      rep_number TEXT UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('admin', 'rep')),
      PRIMARY KEY (user_id, role)
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS rgas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rga_number TEXT UNIQUE,
      sales_rep_id INTEGER NOT NULL REFERENCES users(id),
      order_number TEXT NOT NULL,
      customer_number TEXT NOT NULL,
      reason TEXT NOT NULL,
      shipping REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      decided_at TEXT,
      decided_by INTEGER REFERENCES users(id),
      decision_note TEXT,
      admin_last_seen_at TEXT
    );

    CREATE TABLE IF NOT EXISTS rga_line_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rga_id INTEGER NOT NULL REFERENCES rgas(id) ON DELETE CASCADE,
      line_no INTEGER NOT NULL,
      description TEXT NOT NULL,
      quantity REAL NOT NULL,
      price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rga_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rga_id INTEGER NOT NULL REFERENCES rgas(id) ON DELETE CASCADE,
      type TEXT NOT NULL, -- submitted | approved | rejected | comment
      actor_type TEXT NOT NULL, -- rep | admin (which role the actor used)
      actor_name TEXT NOT NULL,
      message TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sales_rep_id INTEGER NOT NULL REFERENCES users(id),
      rga_id INTEGER NOT NULL REFERENCES rgas(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS counters (
      name TEXT PRIMARY KEY,
      value INTEGER NOT NULL
    );
  `);

  seed(db);
  return db;
}

// Demo seed data only — this file lives in the gitignored data/ directory and
// is rebuilt from scratch on first run. If you already have a data/rga.db
// from an earlier schema (separate admins/sales_reps tables, shipping moved
// off line items, rep auth switched between password/Google, the
// activity/comments table), delete the data/ folder once so it re-seeds
// cleanly on the current schema.
function seed(db: Database.Database) {
  const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number };
  if (userCount.c === 0) {
    const demoHash = bcrypt.hashSync("demo123", 10);
    const adminHash = bcrypt.hashSync("admin123", 10);

    const insertUser = db.prepare(
      "INSERT INTO users (name, email, password_hash, rep_number) VALUES (?, ?, ?, ?)"
    );
    const insertRole = db.prepare("INSERT INTO user_roles (user_id, role) VALUES (?, ?)");

    const addUser = (
      name: string,
      email: string,
      hash: string,
      repNumber: string | null,
      roles: string[]
    ) => {
      const info = insertUser.run(name, email, hash, repNumber);
      const userId = info.lastInsertRowid as number;
      roles.forEach((role) => insertRole.run(userId, role));
    };

    addUser("RGA Administrator", "admin@example.com", adminHash, null, ["admin"]);
    addUser("Jamie Rivera", "jamie.rivera@example.com", demoHash, "REP-101", ["rep"]);
    addUser("Alex Chen", "alex.chen@example.com", demoHash, "REP-102", ["rep"]);
    addUser("Morgan Blake", "morgan.blake@example.com", demoHash, "REP-103", ["rep"]);
    // Dual-role account tied to the person who requested this demo, so they
    // can try the admin/rep mode switch with a single login. Edit/remove freely.
    addUser("Cristiano", "cristiano@smithcorona.com", demoHash, "REP-104", ["admin", "rep"]);
  }

  const rgaCounter = db
    .prepare("SELECT COUNT(*) AS c FROM counters WHERE name = 'rga_number'")
    .get() as { c: number };
  if (rgaCounter.c === 0) {
    db.prepare("INSERT INTO counters (name, value) VALUES ('rga_number', 1000)").run();
  }
}

export function getDb(): Database.Database {
  if (!global.__rgaDb) {
    global.__rgaDb = createConnection();
  }
  return global.__rgaDb;
}

export function nextRgaNumber(db: Database.Database): string {
  const row = db
    .prepare("UPDATE counters SET value = value + 1 WHERE name = 'rga_number' RETURNING value")
    .get() as { value: number };
  return `RGA-${row.value}`;
}
