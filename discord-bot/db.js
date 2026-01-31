const Database = require("better-sqlite3");
const path = require("path");
const { Logger } = require("./logger");

const log = new Logger("DB");
const dbPath = process.env.DB_PATH || path.join(__dirname, "bot.sqlite");
const db = new Database(dbPath);

function initDb() {
  // Configuration du bot (single row)
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

  // Mapping Discord ID -> Tilt username
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

// Helpers config
function getConfig() {
  return db.prepare("SELECT * FROM config WHERE id = 1").get();
}

function updateConfig(fields) {
  const keys = Object.keys(fields);
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => fields[k]);
  values.push(1); // WHERE id = 1

  db.prepare(`UPDATE config SET ${sets}, updated_at = datetime('now') WHERE id = ?`).run(
    ...values
  );
}

// Helpers user links
function linkUser(discordId, tiltUsername) {
  db.prepare(`
    INSERT INTO user_links (discord_id, tilt_username)
    VALUES (?, ?)
    ON CONFLICT(discord_id) DO UPDATE SET tilt_username = excluded.tilt_username
  `).run(discordId, tiltUsername);
}

function getUserLink(discordId) {
  return db.prepare("SELECT * FROM user_links WHERE discord_id = ?").get(discordId);
}

function getAllUserLinks() {
  return db.prepare("SELECT * FROM user_links").all();
}

function unlinkUser(discordId) {
  db.prepare("DELETE FROM user_links WHERE discord_id = ?").run(discordId);
}

module.exports = {
  db,
  initDb,
  getConfig,
  updateConfig,
  linkUser,
  getUserLink,
  getAllUserLinks,
  unlinkUser,
};
