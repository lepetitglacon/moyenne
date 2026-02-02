/**
 * Badge Repository - Data access layer for user_badges table (PostgreSQL)
 * Factory pattern with pool injection
 */

/**
 * Badge types
 * @typedef {'streak_7' | 'streak_30' | 'top_1_monthly' | 'perfect_20' | 'reviewer_100'} BadgeType
 */

/**
 * @typedef {Object} Badge
 * @property {number} id
 * @property {number} user_id
 * @property {string} badge_type
 * @property {string} earned_at
 * @property {Object|null} metadata
 */

/**
 * Create a badge repository instance
 * @param {import('pg').Pool} pool - PostgreSQL pool instance
 */
export function createBadgeRepository(pool) {
  return {
    /**
     * Award a badge to a user
     * @param {number} userId
     * @param {string} badgeType
     * @param {Object} [metadata]
     * @returns {Promise<{ awarded: boolean }>}
     */
    async award(userId, badgeType, metadata = null) {
      try {
        await pool.query(
          `INSERT INTO user_badges (user_id, badge_type, metadata)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, badge_type) DO NOTHING`,
          [userId, badgeType, metadata ? JSON.stringify(metadata) : null]
        );
        return { awarded: true };
      } catch (error) {
        // Ignore duplicate key errors
        return { awarded: false };
      }
    },

    /**
     * Get all badges for a user
     * @param {number} userId
     * @returns {Promise<Badge[]>}
     */
    async getByUser(userId) {
      const result = await pool.query(
        `SELECT id, user_id, badge_type, earned_at, metadata
         FROM user_badges
         WHERE user_id = $1
         ORDER BY earned_at DESC`,
        [userId]
      );
      return result.rows;
    },

    /**
     * Check if user has a specific badge
     * @param {number} userId
     * @param {string} badgeType
     * @returns {Promise<boolean>}
     */
    async hasBadge(userId, badgeType) {
      const result = await pool.query(
        `SELECT 1 FROM user_badges WHERE user_id = $1 AND badge_type = $2`,
        [userId, badgeType]
      );
      return result.rows.length > 0;
    },

    /**
     * Get users who earned a specific badge
     * @param {string} badgeType
     * @returns {Promise<{ userId: number, earnedAt: string }[]>}
     */
    async getUsersWithBadge(badgeType) {
      const result = await pool.query(
        `SELECT user_id as userid, earned_at
         FROM user_badges
         WHERE badge_type = $1
         ORDER BY earned_at ASC`,
        [badgeType]
      );
      return result.rows.map(row => ({
        userId: row.userid,
        earnedAt: row.earned_at,
      }));
    },
  };
}
