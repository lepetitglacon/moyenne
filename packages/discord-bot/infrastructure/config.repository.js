/**
 * Config repository - Database operations for bot configuration (PostgreSQL)
 */

/**
 * Default configuration values
 */
const CONFIG_DEFAULTS = {
  display_mode: "top3",
  show_comments: 1,
  show_stats: 1,
  custom_title: null,
  custom_color: null,
  custom_footer: null,
  days_of_week: "lun,mar,mer,jeu,ven,sam,dim",
  timezone: "Europe/Paris",
  reminder_enabled: 0,
  reminder_minutes: 30,
  reminder_message: null,
  mention_role_id: null,
  min_participants: 0,
};

/**
 * @param {import("pg").Pool} pool - PostgreSQL pool
 */
function createConfigRepository(pool) {
  return {
    /**
     * Get current configuration
     */
    async get() {
      const result = await pool.query("SELECT * FROM config WHERE id = 1");
      return result.rows[0];
    },

    /**
     * Update configuration fields
     * @param {Object} fields - Fields to update
     */
    async update(fields) {
      const keys = Object.keys(fields);
      if (keys.length === 0) return;

      const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
      const values = keys.map((k) => fields[k]);
      values.push(1); // WHERE id = 1

      await pool.query(
        `UPDATE config SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`,
        values
      );
    },

    /**
     * Reset configuration to defaults (preserves channel, guild, enabled, recap_time)
     */
    async reset() {
      await this.update(CONFIG_DEFAULTS);
    },

    /**
     * Get default configuration values
     */
    getDefaults() {
      return { ...CONFIG_DEFAULTS };
    },
  };
}

module.exports = { createConfigRepository, CONFIG_DEFAULTS };
