/**
 * Config repository - Database operations for bot configuration
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
 * @param {import("better-sqlite3").Database} db
 */
function createConfigRepository(db) {
  return {
    /**
     * Get current configuration
     */
    get() {
      return db.prepare("SELECT * FROM config WHERE id = 1").get();
    },

    /**
     * Update configuration fields
     * @param {Object} fields - Fields to update
     */
    update(fields) {
      const keys = Object.keys(fields);
      if (keys.length === 0) return;

      const sets = keys.map((k) => `${k} = ?`).join(", ");
      const values = keys.map((k) => fields[k]);
      values.push(1); // WHERE id = 1

      db.prepare(
        `UPDATE config SET ${sets}, updated_at = datetime('now') WHERE id = ?`
      ).run(...values);
    },

    /**
     * Reset configuration to defaults (preserves channel, guild, enabled, recap_time)
     */
    reset() {
      this.update(CONFIG_DEFAULTS);
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
