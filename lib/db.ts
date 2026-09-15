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
    CREATE TABLE IF NOT EXISTS sales_reps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rep_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rgas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rga_number TEXT UNIQUE,
      sales_rep_id INTEGER NOT NULL REFERENCES sales_reps(id),
      order_number TEXT NOT NULL,
      customer_number TEXT NOT NULL,
      reason TEXT NOT NULL,
      shipping REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      decided_at TEXT,
      decided_by INTEGER REFERENCES admins(id),
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
      actor_type TEXT NOT NULL, -- rep | admin
      actor_name TEXT NOT NULL,
      message TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sales_rep_id INTEGER NOT NULL REFERENCES sales_reps(id),
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
// from an earlier schema (shipping moved off line items, rep auth switched
// between password/Google, the activity/comments table, or the new
// sales_reps.is_active column), delete the data/ folder once so it re-seeds
// cleanly.
function seed(db: Database.Database) {
  const repCount = db.prepare("SELECT COUNT(*) AS c FROM sales_reps").get() as { c: number };
  if (repCount.c === 0) {
    const hash = bcrypt.hashSync("demo123", 10);
    const insert = db.prepare(
      "INSERT INTO sales_reps (rep_number, name, email, password_hash) VALUES (?, ?, ?, ?)"
    );
    insert.run("REP-101", "Jamie Rivera", "jamie.rivera@example.com", hash);
    insert.run("REP-102", "Alex Chen", "alex.chen@example.com", hash);
    insert.run("REP-103", "Morgan Blake", "morgan.blake@example.com", hash);
    insert.run("REP-104", "Cristiano", "cristiano@smithcorona.com", hash);
  }

  const adminCount = db.prepare("SELECT COUNT(*) AS c FROM admins").get() as { c: number };
  if (adminCount.c === 0) {
    const hash = bcrypt.hashSync("admin123", 10);
    db.prepare(
      "INSERT INTO admins (username, name, password_hash) VALUES (?, ?, ?)"
    ).run("admin", "RGA Administrator", hash);
  }

  const rgaCounter = db.prepare("SELECT COUNT(*) AS c FROM counters WHERE name = 'rga_number'").get() as { c: number };
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
