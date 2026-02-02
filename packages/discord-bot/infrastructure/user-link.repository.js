/**
 * User link repository - Database operations for Discord-Tilt user links (PostgreSQL)
 */

/**
 * @param {import("pg").Pool} pool - PostgreSQL pool
 */
function createUserLinkRepository(pool) {
  return {
    async link(discordId, tiltUsername) {
      await pool.query(
        `INSERT INTO user_links (discord_id, tilt_username)
         VALUES ($1, $2)
         ON CONFLICT(discord_id) DO UPDATE SET tilt_username = EXCLUDED.tilt_username`,
        [discordId, tiltUsername]
      );
    },

    async findByDiscordId(discordId) {
      const result = await pool.query(
        "SELECT * FROM user_links WHERE discord_id = $1",
        [discordId]
      );
      return result.rows[0];
    },

    async findAll() {
      const result = await pool.query("SELECT * FROM user_links");
      return result.rows;
    },

    async unlink(discordId) {
      await pool.query("DELETE FROM user_links WHERE discord_id = $1", [discordId]);
    },
  };
}

module.exports = { createUserLinkRepository };
