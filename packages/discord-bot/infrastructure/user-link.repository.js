/**
 * User link repository - Database operations for Discord-Tilt user links
 */

/**
 * @param {import("better-sqlite3").Database} db
 */
function createUserLinkRepository(db) {
  return {
    link(discordId, tiltUsername) {
      db.prepare(`
        INSERT INTO user_links (discord_id, tilt_username)
        VALUES (?, ?)
        ON CONFLICT(discord_id) DO UPDATE SET tilt_username = excluded.tilt_username
      `).run(discordId, tiltUsername);
    },

    findByDiscordId(discordId) {
      return db.prepare(
        "SELECT * FROM user_links WHERE discord_id = ?"
      ).get(discordId);
    },

    findAll() {
      return db.prepare("SELECT * FROM user_links").all();
    },

    unlink(discordId) {
      db.prepare("DELETE FROM user_links WHERE discord_id = ?").run(discordId);
    },
  };
}

module.exports = { createUserLinkRepository };
