import Database from "better-sqlite3"
import path from "path"
import bcrypt from "bcryptjs"
import {fileURLToPath} from "url";


export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
const dbPath = process.env.DB_PATH || process.env.TEST_DB_PATH || path.join(__dirname, "database.sqlite");
const db = new Database(dbPath);

function initDb() {
  // Users
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      last_login_at TEXT
    )
  `).run();

  // Entries (1 entrée par user et par jour)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,                 -- YYYY-MM-DD
      rating INTEGER NOT NULL,            -- 0..20
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `).run();

  // Ratings (note que "moi" je mets à "l'autre" sur un jour donné)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      date TEXT NOT NULL,                 -- YYYY-MM-DD (date de l'entrée notée)
      rating INTEGER NOT NULL,            -- 0..20
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(from_user_id, to_user_id, date),
      FOREIGN KEY (from_user_id) REFERENCES users(id),
      FOREIGN KEY (to_user_id) REFERENCES users(id)
    )
  `).run();

  // ✅ Sessions de connexion
  db.prepare(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      login_at TEXT NOT NULL DEFAULT (datetime('now')),
      logout_at TEXT,
      ip TEXT,
      user_agent TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `).run();

  // ✅ Event log (analytics/debug)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT NOT NULL,                 -- ex: login, entry_saved, rating_saved, page_view
      at TEXT NOT NULL DEFAULT (datetime('now')),
      meta_json TEXT,                     -- JSON string
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `).run();

  // Index utiles
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries(user_id, date)`).run();

  db.prepare(`CREATE INDEX IF NOT EXISTS idx_ratings_from_date ON ratings(from_user_id, date)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_ratings_to_date ON ratings(to_user_id, date)`).run();

  db.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_user_login ON user_sessions(user_id, login_at)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_events_type_at ON events(type, at)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_events_user_at ON events(user_id, at)`).run();

  // Seed admin si absent
  const admin = db.prepare("SELECT id FROM users WHERE username = ?").get("admin");
  if (!admin) {
    const hashed = bcrypt.hashSync("admin123", 10);
    db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run("admin", hashed);
    console.log("Seed user created: admin / admin123");
  }
}

export { db, initDb }
