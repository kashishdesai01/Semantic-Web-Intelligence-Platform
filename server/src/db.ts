import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "insightlens.sqlite");
export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE NOT NULL,
    title TEXT,
    domain TEXT,
    first_seen_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    summary TEXT NOT NULL,
    key_insights TEXT NOT NULL,         -- JSON string
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (source_id) REFERENCES sources(id)
  );
`);
