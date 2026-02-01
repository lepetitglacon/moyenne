/**
 * Config repository - Database operations for bot configuration
 */

/**
 * @param {import("better-sqlite3").Database} db
 */
function createConfigRepository(db) {
  return {
    get() {
      return db.prepare("SELECT * FROM config WHERE id = 1").get();
    },

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
  };
}

module.exports = { createConfigRepository };
