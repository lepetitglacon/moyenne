/**
 * Database initialization
 */

const Database = require("better-sqlite3");
const path = require("path");
const { Logger } = require("./logger");

const log = new Logger("DB");
const dbPath = process.env.DB_PATH || path.join(__dirname, "bot.sqlite");
const db = new Database(dbPath);

function initDb() {
  // Bot configuration (single row)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      guild_id TEXT,
      channel_id TEXT,
      enabled INTEGER DEFAULT 1,
      recap_time TEXT DEFAULT '23:30',
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  // Insert default config if not exists
  db.prepare(`INSERT OR IGNORE INTO config (id) VALUES (1)`).run();

  // Discord ID -> Tilt username mapping
  db.prepare(`
    CREATE TABLE IF NOT EXISTS user_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT UNIQUE NOT NULL,
      tilt_username TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  log.info("Base de données initialisée");
}

module.exports = {
  db,
  initDb,
};
