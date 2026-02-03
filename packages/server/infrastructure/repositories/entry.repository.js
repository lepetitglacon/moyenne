/**
 * Entry Repository - Data access layer for entries table (PostgreSQL)
 * Factory pattern with pool injection
 */

/**
 * @typedef {Object} Entry
 * @property {number} id
 * @property {number} user_id
 * @property {string} date - YYYY-MM-DD
 * @property {number} rating - 0-20
 * @property {string|null} description
 */

/**
 * @typedef {Object} EntryWithUser
 * @property {number} user_id
 * @property {string} username
 * @property {string} date
 * @property {number} rating
 * @property {string|null} description
 */

/**
 * Create an entry repository instance
 * @param {import('pg').Pool} pool - PostgreSQL pool instance
 */
export function createEntryRepository(pool) {
  return {
    /**
     * Find entry by user ID and date
     * @param {number} userId
     * @param {string} date - YYYY-MM-DD
     * @returns {Promise<{ id: number }|undefined>}
     */
    async findIdByUserAndDate(userId, date) {
      const result = await pool.query(
        "SELECT id FROM entries WHERE user_id = $1 AND date = $2",
        [userId, date]
      );
      return result.rows[0];
    },

    /**
     * Get entry details by user ID and date
     * @param {number} userId
     * @param {string} date - YYYY-MM-DD
     * @returns {Promise<{ date: string, rating: number, description: string|null, tags: string[] }|undefined>}
     */
    async findByUserAndDate(userId, date) {
      const result = await pool.query(
        `SELECT date, rating, description, COALESCE(tags, '[]') as tags
         FROM entries
         WHERE user_id = $1 AND date = $2
         LIMIT 1`,
        [userId, date]
      );
      const row = result.rows[0];
      if (row) {
        row.tags = Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || '[]');
      }
      return row;
    },

    /**
     * Insert a new entry
     * @param {number} userId
     * @param {string} date
     * @param {number} rating
     * @param {string|null} description
     * @param {string[]} tags
     * @returns {Promise<{ rowCount: number }>}
     */
    async insert(userId, date, rating, description, tags = []) {
      const result = await pool.query(
        "INSERT INTO entries (user_id, date, rating, description, tags) VALUES ($1, $2, $3, $4, $5)",
        [userId, date, rating, description, JSON.stringify(tags)]
      );
      return { rowCount: result.rowCount };
    },

    /**
     * Update an existing entry
     * @param {number} id - Entry ID
     * @param {number} rating
     * @param {string|null} description
     * @param {string[]} tags
     * @returns {Promise<{ rowCount: number }>}
     */
    async update(id, rating, description, tags = []) {
      const result = await pool.query(
        "UPDATE entries SET rating = $1, description = $2, tags = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4",
        [rating, description, JSON.stringify(tags), id]
      );
      return { rowCount: result.rowCount };
    },

    /**
     * Upsert entry (insert or update)
     * @param {number} userId
     * @param {string} date
     * @param {number} rating
     * @param {string|null} description
     * @param {string[]} tags
     * @returns {Promise<{ isUpdate: boolean }>}
     */
    async upsert(userId, date, rating, description, tags = []) {
      const existing = await this.findIdByUserAndDate(userId, date);
      if (existing) {
        await this.update(existing.id, rating, description, tags);
        return { isUpdate: true };
      } else {
        await this.insert(userId, date, rating, description, tags);
        return { isUpdate: false };
      }
    },

    /**
     * Get last entry for a user (most recent by date)
     * @param {number} userId
     * @returns {Promise<{ date: string, rating: number, description: string|null, tags: string[] }|undefined>}
     */
    async getLastByUser(userId) {
      const result = await pool.query(
        `SELECT date, rating, description, COALESCE(tags, '[]') as tags
         FROM entries
         WHERE user_id = $1
         ORDER BY date DESC
         LIMIT 1`,
        [userId]
      );
      const row = result.rows[0];
      if (row) {
        row.tags = Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || '[]');
      }
      return row;
    },

    /**
     * Count total entries for a user
     * @param {number} userId
     * @returns {Promise<number>}
     */
    async countByUser(userId) {
      const result = await pool.query(
        "SELECT COUNT(*) as count FROM entries WHERE user_id = $1",
        [userId]
      );
      return parseInt(result.rows[0]?.count ?? 0, 10);
    },

    /**
     * Get average rating for a user in a date range
     * @param {number} userId
     * @param {string} startDate - YYYY-MM-DD
     * @param {string} endDate - YYYY-MM-DD
     * @returns {Promise<number|null>}
     */
    async getAvgByUserAndRange(userId, startDate, endDate) {
      const result = await pool.query(
        `SELECT AVG(rating) as avg
         FROM entries
         WHERE user_id = $1
           AND date >= $2
           AND date <= $3`,
        [userId, startDate, endDate]
      );
      return result.rows[0]?.avg ? parseFloat(result.rows[0].avg) : null;
    },

    /**
     * List entries for a user in a date range
     * @param {number} userId
     * @param {string} startDate - YYYY-MM-DD
     * @param {string} endDate - YYYY-MM-DD
     * @returns {Promise<{ date: string, rating: number, description: string|null, tags: string[] }[]>}
     */
    async listByUserAndRange(userId, startDate, endDate) {
      const result = await pool.query(
        `SELECT date, rating, description, COALESCE(tags, '[]') as tags
         FROM entries
         WHERE user_id = $1
           AND date >= $2
           AND date <= $3
         ORDER BY date ASC`,
        [userId, startDate, endDate]
      );
      return result.rows.map(row => ({
        ...row,
        tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || '[]'),
      }));
    },

    /**
     * List all entries for a user (for streak calculation)
     * @param {number} userId
     * @returns {Promise<{ date: string }[]>}
     */
    async listAllByUser(userId) {
      const result = await pool.query(
        `SELECT date
         FROM entries
         WHERE user_id = $1
         ORDER BY date ASC`,
        [userId]
      );
      return result.rows;
    },

    /**
     * Find next entry to review for a user
     * Returns a random entry from today that the user hasn't rated yet
     * @param {number} userId - Current user ID (excludes their own entry)
     * @param {string} date - YYYY-MM-DD
     * @returns {Promise<EntryWithUser|undefined>}
     */
    async findNextReviewForUser(userId, date) {
      const result = await pool.query(
        `SELECT e.user_id, u.username, e.date, e.rating, e.description
         FROM entries e
         JOIN users u ON u.id = e.user_id
         WHERE e.user_id != $1
           AND e.date = $2
           AND NOT EXISTS (
             SELECT 1 FROM ratings r
             WHERE r.from_user_id = $1
               AND r.to_user_id = e.user_id
               AND r.date = e.date
           )
         ORDER BY RANDOM()
         LIMIT 1`,
        [userId, date]
      );
      return result.rows[0];
    },

    /**
     * List all entries for a date with user info (for recap)
     * Sorted by rating DESC
     * @param {string} date - YYYY-MM-DD
     * @returns {Promise<EntryWithUser[]>}
     */
    async listByDateWithUsers(date) {
      const result = await pool.query(
        `SELECT e.*, COALESCE(e.tags, '[]') as tags, u.username
         FROM entries e
         JOIN users u ON u.id = e.user_id
         WHERE e.date = $1
         ORDER BY e.rating DESC`,
        [date]
      );
      return result.rows.map(row => ({
        ...row,
        tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || '[]'),
      }));
    },

    /**
     * Get leaderboard by average rating for a date range
     * @param {string} startDate - YYYY-MM-DD
     * @param {string} endDate - YYYY-MM-DD
     * @returns {Promise<{ userid: number, username: string, avgrating: number, entrycount: number }[]>}
     */
    async getLeaderboardByAvg(startDate, endDate) {
      const result = await pool.query(
        `SELECT
           e.user_id as userid,
           u.username,
           ROUND(AVG(e.rating)::numeric, 1) as avgrating,
           COUNT(*)::int as entrycount
         FROM entries e
         JOIN users u ON u.id = e.user_id
         WHERE e.date >= $1 AND e.date <= $2
         GROUP BY e.user_id, u.username
         ORDER BY avgrating DESC, entrycount DESC`,
        [startDate, endDate]
      );
      return result.rows;
    },

    /**
     * Get all-time leaderboard by average rating
     * @returns {Promise<{ userid: number, username: string, avgrating: number, entrycount: number }[]>}
     */
    async getLeaderboardAllTime() {
      const result = await pool.query(
        `SELECT
           e.user_id as userid,
           u.username,
           ROUND(AVG(e.rating)::numeric, 1) as avgrating,
           COUNT(*)::int as entrycount
         FROM entries e
         JOIN users u ON u.id = e.user_id
         GROUP BY e.user_id, u.username
         ORDER BY avgrating DESC, entrycount DESC`
      );
      return result.rows;
    },

    /**
     * Get leaderboard by participation count
     * @returns {Promise<{ userid: number, username: string, entrycount: number, avgrating: number }[]>}
     */
    async getLeaderboardByParticipation() {
      const result = await pool.query(
        `SELECT
           e.user_id as userid,
           u.username,
           COUNT(*)::int as entrycount,
           ROUND(AVG(e.rating)::numeric, 1) as avgrating
         FROM entries e
         JOIN users u ON u.id = e.user_id
         GROUP BY e.user_id, u.username
         ORDER BY entrycount DESC, avgrating DESC`
      );
      return result.rows;
    },

    /**
     * Get monthly averages for a user over the last N months
     * @param {number} userId
     * @param {number} months - Number of months to look back
     * @returns {Promise<{ month: string, avgrating: number, entrycount: number }[]>}
     */
    async getMonthlyAverages(userId, months = 12) {
      const result = await pool.query(
        `SELECT
           TO_CHAR(date, 'YYYY-MM') as month,
           ROUND(AVG(rating)::numeric, 1) as avgrating,
           COUNT(*)::int as entrycount
         FROM entries
         WHERE user_id = $1
           AND date >= CURRENT_DATE - INTERVAL '1 month' * $2
         GROUP BY TO_CHAR(date, 'YYYY-MM')
         ORDER BY month ASC`,
        [userId, months]
      );
      return result.rows;
    },

    /**
     * Get global monthly averages (all users) over the last N months
     * @param {number} months - Number of months to look back
     * @returns {Promise<{ month: string, avgrating: number, entrycount: number }[]>}
     */
    async getGlobalMonthlyAverages(months = 12) {
      const result = await pool.query(
        `SELECT
           TO_CHAR(date, 'YYYY-MM') as month,
           ROUND(AVG(rating)::numeric, 1) as avgrating,
           COUNT(*)::int as entrycount
         FROM entries
         WHERE date >= CURRENT_DATE - INTERVAL '1 month' * $1
         GROUP BY TO_CHAR(date, 'YYYY-MM')
         ORDER BY month ASC`,
        [months]
      );
      return result.rows;
    },

    /**
     * Get all entries for a user in a year (for heatmap)
     * @param {number} userId
     * @param {number} year
     * @returns {Promise<{ date: string, rating: number }[]>}
     */
    async getYearEntries(userId, year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      const result = await pool.query(
        `SELECT date, rating
         FROM entries
         WHERE user_id = $1
           AND date >= $2
           AND date <= $3
         ORDER BY date ASC`,
        [userId, startDate, endDate]
      );
      return result.rows;
    },

    /**
     * Get rating distribution for a user
     * @param {number} userId
     * @returns {Promise<{ rating: number, count: number }[]>}
     */
    async getRatingDistribution(userId) {
      const result = await pool.query(
        `SELECT rating, COUNT(*)::int as count
         FROM entries
         WHERE user_id = $1
         GROUP BY rating
         ORDER BY rating ASC`,
        [userId]
      );
      return result.rows;
    },

    /**
     * Get average rating by day of week for a user
     * @param {number} userId
     * @returns {Promise<{ dayofweek: number, avgrating: number, entrycount: number }[]>}
     */
    async getAverageByDayOfWeek(userId) {
      const result = await pool.query(
        `SELECT
           EXTRACT(DOW FROM date)::int as dayofweek,
           ROUND(AVG(rating)::numeric, 1) as avgrating,
           COUNT(*)::int as entrycount
         FROM entries
         WHERE user_id = $1
         GROUP BY EXTRACT(DOW FROM date)
         ORDER BY dayofweek ASC`,
        [userId]
      );
      return result.rows;
    },

    /**
     * Get global average rating
     * @returns {Promise<number|null>}
     */
    async getGlobalAverage() {
      const result = await pool.query(
        `SELECT ROUND(AVG(rating)::numeric, 1) as avg FROM entries`
      );
      return result.rows[0]?.avg ? parseFloat(result.rows[0].avg) : null;
    },

    /**
     * Get average rating by tag
     * @param {number} [userId] - Optional user filter
     * @returns {Promise<{ tag: string, avgRating: number, count: number }[]>}
     */
    async getAverageByTag(userId) {
      const userFilter = userId ? 'AND e.user_id = $1' : '';
      const params = userId ? [userId] : [];

      const result = await pool.query(
        `SELECT
           tag,
           ROUND(AVG(e.rating)::numeric, 1) as avg_rating,
           COUNT(*)::int as count
         FROM entries e,
              jsonb_array_elements_text(COALESCE(e.tags, '[]'::jsonb)) as tag
         WHERE jsonb_array_length(COALESCE(e.tags, '[]'::jsonb)) > 0
         ${userFilter}
         GROUP BY tag
         ORDER BY count DESC`,
        params
      );

      return result.rows.map(row => ({
        tag: row.tag,
        avgRating: parseFloat(row.avg_rating),
        count: row.count,
      }));
    },

    /**
     * Get tag distribution (frequency)
     * @param {number} [userId] - Optional user filter
     * @returns {Promise<{ tag: string, count: number, percent: number }[]>}
     */
    async getTagDistribution(userId) {
      const userFilter = userId ? 'WHERE e.user_id = $1' : '';
      const params = userId ? [userId] : [];

      // Get total entries count
      const totalResult = await pool.query(
        `SELECT COUNT(*)::int as total FROM entries e ${userFilter}`,
        params
      );
      const totalEntries = totalResult.rows[0]?.total || 1;

      const result = await pool.query(
        `SELECT
           tag,
           COUNT(*)::int as count
         FROM entries e,
              jsonb_array_elements_text(COALESCE(e.tags, '[]'::jsonb)) as tag
         ${userFilter ? userFilter + ' AND' : 'WHERE'} jsonb_array_length(COALESCE(e.tags, '[]'::jsonb)) > 0
         GROUP BY tag
         ORDER BY count DESC`,
        params
      );

      return result.rows.map(row => ({
        tag: row.tag,
        count: row.count,
        percent: Math.round((row.count / totalEntries) * 1000) / 10,
      }));
    },

    /**
     * Get tag correlations (impact on rating)
     * Compares average rating with tag vs without tag
     * @param {number} [userId] - Optional user filter
     * @returns {Promise<{ tag: string, withTag: number, withoutTag: number, impact: number }[]>}
     */
    async getTagCorrelations(userId) {
      const userFilter = userId ? 'AND user_id = $1' : '';
      const params = userId ? [userId] : [];

      // Get global average
      const globalResult = await pool.query(
        `SELECT ROUND(AVG(rating)::numeric, 2) as avg FROM entries WHERE 1=1 ${userFilter}`,
        params
      );
      const globalAvg = parseFloat(globalResult.rows[0]?.avg) || 10;

      // Get average per tag
      const tagsResult = await pool.query(
        `SELECT
           tag,
           ROUND(AVG(e.rating)::numeric, 2) as avg_with_tag,
           COUNT(*)::int as count
         FROM entries e,
              jsonb_array_elements_text(COALESCE(e.tags, '[]'::jsonb)) as tag
         WHERE jsonb_array_length(COALESCE(e.tags, '[]'::jsonb)) > 0
         ${userFilter}
         GROUP BY tag
         HAVING COUNT(*) >= 1
         ORDER BY AVG(e.rating) DESC`,
        params
      );

      return tagsResult.rows.map(row => {
        const withTag = parseFloat(row.avg_with_tag);
        const impact = Math.round((withTag - globalAvg) * 10) / 10;
        return {
          tag: row.tag,
          withTag,
          withoutTag: globalAvg,
          impact,
          count: row.count,
        };
      });
    },

    /**
     * Get daily leaderboard for a specific date
     * @param {string} date - YYYY-MM-DD
     * @returns {Promise<{ rank: number, userId: number, username: string, rating: number, tags: string[] }[]>}
     */
    async getDailyLeaderboard(date) {
      const result = await pool.query(
        `SELECT
           e.user_id,
           u.username,
           e.rating,
           COALESCE(e.tags, '[]') as tags
         FROM entries e
         JOIN users u ON u.id = e.user_id
         WHERE e.date = $1
         ORDER BY e.rating DESC, u.username ASC`,
        [date]
      );

      return result.rows.map((row, index) => ({
        rank: index + 1,
        userId: row.user_id,
        username: row.username,
        rating: parseInt(row.rating, 10),
        tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || '[]'),
      }));
    },
  };
}
