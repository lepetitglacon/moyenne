/**
 * Guess Repository - Data access layer for guesses table (PostgreSQL)
 * Factory pattern with pool injection
 */

/**
 * @typedef {Object} Guess
 * @property {number} id
 * @property {number} guesser_id
 * @property {number} entry_user_id
 * @property {number} guessed_user_id
 * @property {string} date - YYYY-MM-DD
 * @property {boolean} is_correct
 */

/**
 * @typedef {Object} GuessStats
 * @property {number} totalGuesses
 * @property {number} correctGuesses
 * @property {number} accuracy - Percentage (0-100)
 */

/**
 * @typedef {Object} DetectiveLeaderboardEntry
 * @property {number} userId
 * @property {string} username
 * @property {number} totalGuesses
 * @property {number} correctGuesses
 * @property {number} accuracy
 */

/**
 * Create a guess repository instance
 * @param {import('pg').Pool} pool - PostgreSQL pool instance
 */
export function createGuessRepository(pool) {
  return {
    /**
     * Save a guess
     * @param {number} guesserId - User making the guess
     * @param {number} entryUserId - Actual author of the entry
     * @param {number} guessedUserId - Who the guesser thinks wrote it
     * @param {string} date - YYYY-MM-DD
     * @returns {Promise<{ isCorrect: boolean, streak: number }>}
     */
    async save(guesserId, entryUserId, guessedUserId, date) {
      const isCorrect = entryUserId === guessedUserId;

      await pool.query(
        `INSERT INTO guesses (guesser_id, entry_user_id, guessed_user_id, date, is_correct)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (guesser_id, date) DO UPDATE SET
           entry_user_id = $2,
           guessed_user_id = $3,
           is_correct = $5`,
        [guesserId, entryUserId, guessedUserId, date, isCorrect]
      );

      // Calculate current streak
      const streak = await this.getStreak(guesserId);

      return { isCorrect, streak };
    },

    /**
     * Get stats for a user
     * @param {number} userId
     * @returns {Promise<GuessStats>}
     */
    async getStats(userId) {
      const result = await pool.query(
        `SELECT
           COUNT(*)::int as total_guesses,
           SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::int as correct_guesses
         FROM guesses
         WHERE guesser_id = $1`,
        [userId]
      );

      const row = result.rows[0];
      const totalGuesses = row?.total_guesses || 0;
      const correctGuesses = row?.correct_guesses || 0;
      const accuracy = totalGuesses > 0 ? Math.round((correctGuesses / totalGuesses) * 100) : 0;

      return {
        totalGuesses,
        correctGuesses,
        accuracy,
      };
    },

    /**
     * Get detective leaderboard (minimum 5 guesses required)
     * @param {number} [limit=10]
     * @returns {Promise<DetectiveLeaderboardEntry[]>}
     */
    async getLeaderboard(limit = 10) {
      const result = await pool.query(
        `SELECT
           g.guesser_id as user_id,
           u.username,
           COUNT(*)::int as total_guesses,
           SUM(CASE WHEN g.is_correct THEN 1 ELSE 0 END)::int as correct_guesses,
           ROUND((SUM(CASE WHEN g.is_correct THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 1) as accuracy
         FROM guesses g
         JOIN users u ON u.id = g.guesser_id
         GROUP BY g.guesser_id, u.username
         HAVING COUNT(*) >= 1
         ORDER BY accuracy DESC, correct_guesses DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows.map(row => ({
        userId: row.user_id,
        username: row.username,
        totalGuesses: row.total_guesses,
        correctGuesses: row.correct_guesses,
        accuracy: parseFloat(row.accuracy),
      }));
    },

    /**
     * Get current streak of consecutive correct guesses
     * @param {number} userId
     * @returns {Promise<number>}
     */
    async getStreak(userId) {
      // Get all guesses ordered by date descending
      const result = await pool.query(
        `SELECT is_correct, date
         FROM guesses
         WHERE guesser_id = $1
         ORDER BY date DESC`,
        [userId]
      );

      let streak = 0;
      for (const row of result.rows) {
        if (row.is_correct) {
          streak++;
        } else {
          break;
        }
      }

      return streak;
    },

    /**
     * Get longest streak ever for a user
     * @param {number} userId
     * @returns {Promise<number>}
     */
    async getLongestStreak(userId) {
      const result = await pool.query(
        `SELECT is_correct, date
         FROM guesses
         WHERE guesser_id = $1
         ORDER BY date ASC`,
        [userId]
      );

      let maxStreak = 0;
      let currentStreak = 0;

      for (const row of result.rows) {
        if (row.is_correct) {
          currentStreak++;
          if (currentStreak > maxStreak) {
            maxStreak = currentStreak;
          }
        } else {
          currentStreak = 0;
        }
      }

      return maxStreak;
    },

    /**
     * Check if user has made a guess for a date
     * @param {number} userId
     * @param {string} date - YYYY-MM-DD
     * @returns {Promise<boolean>}
     */
    async hasGuessedForDate(userId, date) {
      const result = await pool.query(
        `SELECT 1 FROM guesses WHERE guesser_id = $1 AND date = $2 LIMIT 1`,
        [userId, date]
      );
      return result.rows.length > 0;
    },
  };
}
