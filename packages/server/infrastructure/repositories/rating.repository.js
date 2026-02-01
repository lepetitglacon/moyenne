/**
 * Rating Repository - Data access layer for ratings table
 * Factory pattern with db injection
 */

/**
 * @typedef {Object} Rating
 * @property {number} id
 * @property {number} from_user_id
 * @property {number} to_user_id
 * @property {string} date - YYYY-MM-DD
 * @property {number} rating - 0-20
 */

/**
 * Create a rating repository instance
 * @param {import('better-sqlite3').Database} db - SQLite database instance
 */
export function createRatingRepository(db) {
  return {
    /**
     * Create a new rating
     * @param {number} fromUserId - User giving the rating
     * @param {number} toUserId - User receiving the rating
     * @param {string} date - YYYY-MM-DD
     * @param {number} rating - 0-20
     * @returns {import('better-sqlite3').RunResult}
     */
    create(fromUserId, toUserId, date, rating) {
      return db
        .prepare("INSERT INTO ratings (from_user_id, to_user_id, date, rating) VALUES (?, ?, ?, ?)")
        .run(fromUserId, toUserId, date, rating);
    },

    /**
     * Count total ratings given on a specific date
     * @param {string} date - YYYY-MM-DD
     * @returns {number}
     */
    countByDate(date) {
      const row = db
        .prepare("SELECT COUNT(*) as count FROM ratings WHERE date = ?")
        .get(date);
      return row?.count ?? 0;
    },
  };
}
