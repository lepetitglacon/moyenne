/**
 * Entry Repository - Data access layer for entries table
 * Factory pattern with db injection
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
 * @param {import('better-sqlite3').Database} db - SQLite database instance
 */
export function createEntryRepository(db) {
  return {
    /**
     * Find entry by user ID and date
     * @param {number} userId
     * @param {string} date - YYYY-MM-DD
     * @returns {{ id: number }|undefined}
     */
    findIdByUserAndDate(userId, date) {
      return db
        .prepare("SELECT id FROM entries WHERE user_id = ? AND date = ?")
        .get(userId, date);
    },

    /**
     * Get entry details by user ID and date
     * @param {number} userId
     * @param {string} date - YYYY-MM-DD
     * @returns {{ date: string, rating: number, description: string|null }|undefined}
     */
    findByUserAndDate(userId, date) {
      return db
        .prepare(`
          SELECT date, rating, description
          FROM entries
          WHERE user_id = ? AND date = ?
          LIMIT 1
        `)
        .get(userId, date);
    },

    /**
     * Insert a new entry
     * @param {number} userId
     * @param {string} date
     * @param {number} rating
     * @param {string|null} description
     */
    insert(userId, date, rating, description) {
      return db
        .prepare("INSERT INTO entries (user_id, date, rating, description) VALUES (?, ?, ?, ?)")
        .run(userId, date, rating, description);
    },

    /**
     * Update an existing entry
     * @param {number} id - Entry ID
     * @param {number} rating
     * @param {string|null} description
     */
    update(id, rating, description) {
      return db
        .prepare("UPDATE entries SET rating = ?, description = ? WHERE id = ?")
        .run(rating, description, id);
    },

    /**
     * Upsert entry (insert or update)
     * @param {number} userId
     * @param {string} date
     * @param {number} rating
     * @param {string|null} description
     * @returns {{ isUpdate: boolean }}
     */
    upsert(userId, date, rating, description) {
      const existing = this.findIdByUserAndDate(userId, date);
      if (existing) {
        this.update(existing.id, rating, description);
        return { isUpdate: true };
      } else {
        this.insert(userId, date, rating, description);
        return { isUpdate: false };
      }
    },

    /**
     * Get last entry for a user (most recent by date)
     * @param {number} userId
     * @returns {{ date: string, rating: number, description: string|null }|undefined}
     */
    getLastByUser(userId) {
      return db
        .prepare(`
          SELECT date, rating, description
          FROM entries
          WHERE user_id = ?
          ORDER BY date DESC
          LIMIT 1
        `)
        .get(userId);
    },

    /**
     * Count total entries for a user
     * @param {number} userId
     * @returns {number}
     */
    countByUser(userId) {
      const row = db
        .prepare("SELECT COUNT(*) as count FROM entries WHERE user_id = ?")
        .get(userId);
      return row?.count ?? 0;
    },

    /**
     * Get average rating for a user in a date range
     * @param {number} userId
     * @param {string} startDate - YYYY-MM-DD
     * @param {string} endDate - YYYY-MM-DD
     * @returns {number|null}
     */
    getAvgByUserAndRange(userId, startDate, endDate) {
      const row = db
        .prepare(`
          SELECT AVG(rating) as avg
          FROM entries
          WHERE user_id = ?
            AND date >= ?
            AND date <= ?
        `)
        .get(userId, startDate, endDate);
      return row?.avg ?? null;
    },

    /**
     * List entries for a user in a date range
     * @param {number} userId
     * @param {string} startDate - YYYY-MM-DD
     * @param {string} endDate - YYYY-MM-DD
     * @returns {{ date: string, rating: number }[]}
     */
    listByUserAndRange(userId, startDate, endDate) {
      return db
        .prepare(`
          SELECT date, rating
          FROM entries
          WHERE user_id = ?
            AND date >= ?
            AND date <= ?
          ORDER BY date ASC
        `)
        .all(userId, startDate, endDate);
    },

    /**
     * List all entries for a user (for streak calculation)
     * @param {number} userId
     * @returns {{ date: string }[]}
     */
    listAllByUser(userId) {
      return db
        .prepare(`
          SELECT date
          FROM entries
          WHERE user_id = ?
          ORDER BY date ASC
        `)
        .all(userId);
    },

    /**
     * Find next entry to review for a user
     * Returns a random entry from today that the user hasn't rated yet
     * @param {number} userId - Current user ID (excludes their own entry)
     * @param {string} date - YYYY-MM-DD
     * @returns {EntryWithUser|undefined}
     */
    findNextReviewForUser(userId, date) {
      return db
        .prepare(`
          SELECT e.user_id, u.username, e.date, e.rating, e.description
          FROM entries e
          JOIN users u ON u.id = e.user_id
          WHERE e.user_id != ?
            AND e.date = ?
            AND NOT EXISTS (
              SELECT 1 FROM ratings r
              WHERE r.from_user_id = ?
                AND r.to_user_id = e.user_id
                AND r.date = e.date
            )
          ORDER BY RANDOM()
          LIMIT 1
        `)
        .get(userId, date, userId);
    },

    /**
     * List all entries for a date with user info (for recap)
     * Sorted by rating DESC
     * @param {string} date - YYYY-MM-DD
     * @returns {EntryWithUser[]}
     */
    listByDateWithUsers(date) {
      return db
        .prepare(`
          SELECT e.*, u.username
          FROM entries e
          JOIN users u ON u.id = e.user_id
          WHERE e.date = ?
          ORDER BY e.rating DESC
        `)
        .all(date);
    },

    /**
     * Get leaderboard by average rating for a date range
     * @param {string} startDate - YYYY-MM-DD
     * @param {string} endDate - YYYY-MM-DD
     * @returns {{ userId: number, username: string, avgRating: number, entryCount: number }[]}
     */
    getLeaderboardByAvg(startDate, endDate) {
      return db
        .prepare(`
          SELECT
            e.user_id as userId,
            u.username,
            ROUND(AVG(e.rating), 1) as avgRating,
            COUNT(*) as entryCount
          FROM entries e
          JOIN users u ON u.id = e.user_id
          WHERE e.date >= ? AND e.date <= ?
          GROUP BY e.user_id
          ORDER BY avgRating DESC, entryCount DESC
        `)
        .all(startDate, endDate);
    },

    /**
     * Get all-time leaderboard by average rating
     * @returns {{ userId: number, username: string, avgRating: number, entryCount: number }[]}
     */
    getLeaderboardAllTime() {
      return db
        .prepare(`
          SELECT
            e.user_id as userId,
            u.username,
            ROUND(AVG(e.rating), 1) as avgRating,
            COUNT(*) as entryCount
          FROM entries e
          JOIN users u ON u.id = e.user_id
          GROUP BY e.user_id
          ORDER BY avgRating DESC, entryCount DESC
        `)
        .all();
    },

    /**
     * Get leaderboard by participation count
     * @returns {{ userId: number, username: string, entryCount: number, avgRating: number }[]}
     */
    getLeaderboardByParticipation() {
      return db
        .prepare(`
          SELECT
            e.user_id as userId,
            u.username,
            COUNT(*) as entryCount,
            ROUND(AVG(e.rating), 1) as avgRating
          FROM entries e
          JOIN users u ON u.id = e.user_id
          GROUP BY e.user_id
          ORDER BY entryCount DESC, avgRating DESC
        `)
        .all();
    },

    /**
     * Get monthly averages for a user over the last N months
     * @param {number} userId
     * @param {number} months - Number of months to look back
     * @returns {{ month: string, avgRating: number, entryCount: number }[]}
     */
    getMonthlyAverages(userId, months = 12) {
      return db
        .prepare(`
          SELECT
            strftime('%Y-%m', date) as month,
            ROUND(AVG(rating), 1) as avgRating,
            COUNT(*) as entryCount
          FROM entries
          WHERE user_id = ?
            AND date >= date('now', '-' || ? || ' months')
          GROUP BY strftime('%Y-%m', date)
          ORDER BY month ASC
        `)
        .all(userId, months);
    },

    /**
     * Get global monthly averages (all users) over the last N months
     * @param {number} months - Number of months to look back
     * @returns {{ month: string, avgRating: number, entryCount: number }[]}
     */
    getGlobalMonthlyAverages(months = 12) {
      return db
        .prepare(`
          SELECT
            strftime('%Y-%m', date) as month,
            ROUND(AVG(rating), 1) as avgRating,
            COUNT(*) as entryCount
          FROM entries
          WHERE date >= date('now', '-' || ? || ' months')
          GROUP BY strftime('%Y-%m', date)
          ORDER BY month ASC
        `)
        .all(months);
    },

    /**
     * Get all entries for a user in a year (for heatmap)
     * @param {number} userId
     * @param {number} year
     * @returns {{ date: string, rating: number }[]}
     */
    getYearEntries(userId, year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      return db
        .prepare(`
          SELECT date, rating
          FROM entries
          WHERE user_id = ?
            AND date >= ?
            AND date <= ?
          ORDER BY date ASC
        `)
        .all(userId, startDate, endDate);
    },

    /**
     * Get rating distribution for a user
     * @param {number} userId
     * @returns {{ rating: number, count: number }[]}
     */
    getRatingDistribution(userId) {
      return db
        .prepare(`
          SELECT rating, COUNT(*) as count
          FROM entries
          WHERE user_id = ?
          GROUP BY rating
          ORDER BY rating ASC
        `)
        .all(userId);
    },

    /**
     * Get average rating by day of week for a user
     * @param {number} userId
     * @returns {{ dayOfWeek: number, avgRating: number, entryCount: number }[]}
     */
    getAverageByDayOfWeek(userId) {
      return db
        .prepare(`
          SELECT
            CAST(strftime('%w', date) AS INTEGER) as dayOfWeek,
            ROUND(AVG(rating), 1) as avgRating,
            COUNT(*) as entryCount
          FROM entries
          WHERE user_id = ?
          GROUP BY strftime('%w', date)
          ORDER BY dayOfWeek ASC
        `)
        .all(userId);
    },

    /**
     * Get global average rating
     * @returns {number|null}
     */
    getGlobalAverage() {
      const row = db
        .prepare(`SELECT ROUND(AVG(rating), 1) as avg FROM entries`)
        .get();
      return row?.avg ?? null;
    },
  };
}
