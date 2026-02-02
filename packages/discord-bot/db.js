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
      updated_at TEXT DEFAULT (datetime('now')),

      -- Modes d'affichage
      display_mode TEXT DEFAULT 'top3',
      show_comments INTEGER DEFAULT 1,
      show_stats INTEGER DEFAULT 1,

      -- Personnalisation embed
      custom_title TEXT,
      custom_color TEXT,
      custom_footer TEXT,

      -- Scheduling avancé
      days_of_week TEXT DEFAULT 'lun,mar,mer,jeu,ven,sam,dim',
      timezone TEXT DEFAULT 'Europe/Paris',

      -- Notifications
      reminder_enabled INTEGER DEFAULT 0,
      reminder_minutes INTEGER DEFAULT 30,
      reminder_message TEXT,
      mention_role_id TEXT,

      -- Seuils
      min_participants INTEGER DEFAULT 0
    )
  `).run();

  // Migration: add new columns if they don't exist
  const columns = db.pragma("table_info(config)").map((c) => c.name);
  const newColumns = [
    { name: "display_mode", def: "TEXT DEFAULT 'top3'" },
    { name: "show_comments", def: "INTEGER DEFAULT 1" },
    { name: "show_stats", def: "INTEGER DEFAULT 1" },
    { name: "custom_title", def: "TEXT" },
    { name: "custom_color", def: "TEXT" },
    { name: "custom_footer", def: "TEXT" },
    { name: "days_of_week", def: "TEXT DEFAULT 'lun,mar,mer,jeu,ven,sam,dim'" },
    { name: "timezone", def: "TEXT DEFAULT 'Europe/Paris'" },
    { name: "reminder_enabled", def: "INTEGER DEFAULT 0" },
    { name: "reminder_minutes", def: "INTEGER DEFAULT 30" },
    { name: "reminder_message", def: "TEXT" },
    { name: "mention_role_id", def: "TEXT" },
    { name: "min_participants", def: "INTEGER DEFAULT 0" },
  ];

  for (const col of newColumns) {
    if (!columns.includes(col.name)) {
      db.prepare(`ALTER TABLE config ADD COLUMN ${col.name} ${col.def}`).run();
      log.info(`Colonne ${col.name} ajoutée`);
    }
  }

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
