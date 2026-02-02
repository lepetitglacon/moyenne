/**
 * Rating Repository - Data access layer for ratings table (PostgreSQL)
 * Factory pattern with pool injection
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
 * @param {import('pg').Pool} pool - PostgreSQL pool instance
 */
export function createRatingRepository(pool) {
  return {
    /**
     * Create a new rating
     * @param {number} fromUserId - User giving the rating
     * @param {number} toUserId - User receiving the rating
     * @param {string} date - YYYY-MM-DD
     * @param {number} rating - 0-20
     * @returns {Promise<{ rowCount: number }>}
     */
    async create(fromUserId, toUserId, date, rating) {
      const result = await pool.query(
        "INSERT INTO ratings (from_user_id, to_user_id, date, rating) VALUES ($1, $2, $3, $4)",
        [fromUserId, toUserId, date, rating]
      );
      return { rowCount: result.rowCount };
    },

    /**
     * Count total ratings given on a specific date
     * @param {string} date - YYYY-MM-DD
     * @returns {Promise<number>}
     */
    async countByDate(date) {
      const result = await pool.query(
        "SELECT COUNT(*) as count FROM ratings WHERE date = $1",
        [date]
      );
      return parseInt(result.rows[0]?.count ?? 0, 10);
    },

    /**
     * Count total ratings given by a user (all time)
     * @param {number} userId
     * @returns {Promise<number>}
     */
    async countByUser(userId) {
      const result = await pool.query(
        "SELECT COUNT(*) as count FROM ratings WHERE from_user_id = $1",
        [userId]
      );
      return parseInt(result.rows[0]?.count ?? 0, 10);
    },
  };
}
