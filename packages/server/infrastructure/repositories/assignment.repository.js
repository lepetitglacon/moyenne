/**
 * Assignment Repository - Data access layer for review_assignments table (PostgreSQL)
 * Handles exclusive 1:1 review assignments per day
 */

/**
 * Create an assignment repository instance
 * @param {import('pg').Pool} pool - PostgreSQL pool instance
 */
export function createAssignmentRepository(pool) {
  return {
    /**
     * Get existing assignment for a reviewer on a date
     * @param {number} reviewerId
     * @param {string} date - YYYY-MM-DD
     * @returns {Promise<{ reviewee_id: number }|undefined>}
     */
    async getAssignmentForReviewer(reviewerId, date) {
      const result = await pool.query(
        `SELECT reviewee_id FROM review_assignments
         WHERE reviewer_id = $1 AND date = $2`,
        [reviewerId, date]
      );
      return result.rows[0];
    },

    /**
     * Find an unassigned entry for the date (someone who hasn't been assigned to anyone yet)
     * Excludes the reviewer's own entry
     * @param {number} reviewerId - The person looking for an entry to review
     * @param {string} date - YYYY-MM-DD
     * @returns {Promise<{ user_id: number }|undefined>}
     */
    async findUnassignedEntry(reviewerId, date) {
      const result = await pool.query(
        `SELECT e.user_id
         FROM entries e
         WHERE e.date = $1
           AND e.user_id != $2
           AND NOT EXISTS (
             SELECT 1 FROM review_assignments ra
             WHERE ra.reviewee_id = e.user_id
               AND ra.date = $1
           )
         ORDER BY RANDOM()
         LIMIT 1`,
        [date, reviewerId]
      );
      return result.rows[0];
    },

    /**
     * Create a new assignment
     * @param {number} reviewerId
     * @param {number} revieweeId
     * @param {string} date - YYYY-MM-DD
     * @returns {Promise<{ rowCount: number }>}
     */
    async createAssignment(reviewerId, revieweeId, date) {
      const result = await pool.query(
        `INSERT INTO review_assignments (reviewer_id, reviewee_id, date)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [reviewerId, revieweeId, date]
      );
      return { rowCount: result.rowCount };
    },

    /**
     * Check if reviewer has already rated for the date
     * @param {number} reviewerId
     * @param {string} date - YYYY-MM-DD
     * @returns {Promise<boolean>}
     */
    async hasRatedForDate(reviewerId, date) {
      const result = await pool.query(
        `SELECT 1 FROM ratings
         WHERE from_user_id = $1 AND date = $2
         LIMIT 1`,
        [reviewerId, date]
      );
      return result.rows.length > 0;
    },
  };
}
