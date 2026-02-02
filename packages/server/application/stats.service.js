/**
 * Stats Service - Statistics use cases (PostgreSQL)
 * Handles user stats, recap generation
 */

import {
  getToday,
  getMonthRange,
  calculateRecapStats,
  calculateStreak,
} from "../domain/index.js";
import { NotFoundError } from "../shared/errors.js";

/**
 * @typedef {Object} StatsDependencies
 * @property {import('../infrastructure/repositories/user.repository.js').UserRepository} userRepo
 * @property {import('../infrastructure/repositories/entry.repository.js').EntryRepository} entryRepo
 * @property {import('../infrastructure/repositories/rating.repository.js').RatingRepository} ratingRepo
 * @property {import('../logger.js').Logger} [logger]
 */

/**
 * @typedef {Object} StreakInfo
 * @property {number} currentStreak - Current consecutive days
 * @property {number} longestStreak - All-time record
 */

/**
 * @typedef {Object} UserStatsResult
 * @property {string} today
 * @property {string} monthStart
 * @property {string} monthEnd
 * @property {{ date: string, rating: number, description: string|null }|null} lastEntry
 * @property {{ date: string, rating: number, description: string|null }|null} todayEntry
 * @property {number} participationCount
 * @property {number|null} currentMonthAvg
 * @property {{ date: string, rating: number }[]} monthEntries
 * @property {StreakInfo} streak
 */

/**
 * @typedef {Object} RecapResult
 * @property {string} date
 * @property {number} participantCount
 * @property {number} avgRating
 * @property {{ username: string, rating: number, description: string|null }[]} top3
 * @property {number} ratingsGiven
 */

/**
 * Create stats service instance
 * @param {StatsDependencies} deps
 */
export function createStatsService({ userRepo, entryRepo, ratingRepo, logger }) {
  /**
   * Get stats for a user (internal helper)
   * @param {number} userId
   * @param {string|undefined} monthParam
   * @returns {Promise<UserStatsResult>}
   */
  async function getUserStatsInternal(userId, monthParam) {
    const today = getToday();
    const { monthStart, monthEnd } = getMonthRange(monthParam);

    const lastEntry = await entryRepo.getLastByUser(userId);
    const todayEntry = await entryRepo.findByUserAndDate(userId, today);
    const participationCount = await entryRepo.countByUser(userId);
    const currentMonthAvg = await entryRepo.getAvgByUserAndRange(userId, monthStart, monthEnd);
    const monthEntries = await entryRepo.listByUserAndRange(userId, monthStart, monthEnd);

    // Calculate streak
    const allEntries = await entryRepo.listAllByUser(userId);
    const streakData = calculateStreak(allEntries, today);

    return {
      today,
      monthStart,
      monthEnd,
      lastEntry: lastEntry || null,
      todayEntry: todayEntry || null,
      participationCount,
      currentMonthAvg,
      monthEntries,
      streak: {
        currentStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
      },
    };
  }

  return {
    /**
     * Get stats for current user
     * @param {{ userId: number, month?: string }} params
     * @returns {Promise<UserStatsResult>}
     */
    async getMyStats({ userId, month }) {
      return getUserStatsInternal(userId, month);
    },

    /**
     * Get stats for another user
     * @param {{ userId: number, month?: string }} params
     * @returns {Promise<UserStatsResult & { user: { id: number, username: string } }>}
     * @throws {NotFoundError} If user doesn't exist
     */
    async getUserStats({ userId, month }) {
      const user = await userRepo.findById(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      const stats = await getUserStatsInternal(userId, month);

      return {
        user,
        ...stats,
      };
    },

    /**
     * Get daily recap (for bot)
     * @param {{ date?: string }} params
     * @returns {Promise<RecapResult>}
     */
    async getRecap({ date } = {}) {
      const recapDate = date || getToday();

      // Get entries with user info
      const entries = await entryRepo.listByDateWithUsers(recapDate);

      // Get ratings count
      const ratingsCount = await ratingRepo.countByDate(recapDate);

      // Calculate stats via domain
      const stats = calculateRecapStats(entries, ratingsCount);

      logger?.debug("Récap récupéré", { date: recapDate, participantCount: stats.participantCount });

      return {
        date: recapDate,
        ...stats,
      };
    },

    /**
     * List all users
     * @returns {Promise<{ id: number, username: string }[]>}
     */
    async listUsers() {
      return userRepo.listAll();
    },

    /**
     * Check if a user exists by username
     * @param {{ username: string }} params
     * @returns {Promise<{ exists: boolean, user: { id: number, username: string }|null }>}
     */
    async checkUserExists({ username }) {
      const user = await userRepo.findByUsername(username);
      return {
        exists: !!user,
        user: user || null,
      };
    },

    /**
     * Get leaderboard data
     * @param {{ month?: string }} params
     * @returns {Promise<{ monthly: Array, allTime: Array, topParticipants: Array, monthLabel: string }>}
     */
    async getLeaderboard({ month } = {}) {
      const { monthStart, monthEnd } = getMonthRange(month);

      const monthly = await entryRepo.getLeaderboardByAvg(monthStart, monthEnd);
      const allTime = await entryRepo.getLeaderboardAllTime();
      const topParticipants = await entryRepo.getLeaderboardByParticipation();

      return {
        monthStart,
        monthEnd,
        monthly,
        allTime,
        topParticipants,
      };
    },

    /**
     * Get graph data for a user
     * @param {{ userId: number, year?: number }} params
     * @returns {Promise<Object>} Graph data including monthly trends, heatmap, distribution
     */
    async getGraphData({ userId, year }) {
      const currentYear = year || new Date().getFullYear();

      // Monthly averages for the user (last 12 months)
      const userMonthly = await entryRepo.getMonthlyAverages(userId, 12);

      // Global monthly averages for comparison
      const globalMonthly = await entryRepo.getGlobalMonthlyAverages(12);

      // Year entries for heatmap
      const yearEntries = await entryRepo.getYearEntries(userId, currentYear);

      // Rating distribution
      const distribution = await entryRepo.getRatingDistribution(userId);

      // Average by day of week
      const byDayOfWeek = await entryRepo.getAverageByDayOfWeek(userId);

      // Global average for comparison
      const globalAverage = await entryRepo.getGlobalAverage();

      return {
        year: currentYear,
        userMonthly,
        globalMonthly,
        yearEntries,
        distribution,
        byDayOfWeek,
        globalAverage,
      };
    },

    /**
     * Get weekly recap (for bot)
     * @param {{ date?: string }} params - Optional end date (defaults to today)
     * @returns {Promise<Object>} Weekly recap data
     */
    async getWeeklyRecap({ date } = {}) {
      const endDate = date || getToday();
      const endDateObj = new Date(endDate);

      // Calculate start of week (Monday)
      const dayOfWeek = endDateObj.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const startDateObj = new Date(endDateObj);
      startDateObj.setDate(startDateObj.getDate() - daysToMonday);
      const startDate = startDateObj.toISOString().split("T")[0];

      // Get all entries for the week
      const weeklyLeaderboard = await entryRepo.getLeaderboardByAvg(startDate, endDate);

      // Calculate totals
      let totalRating = 0;
      let totalEntries = 0;
      const uniqueParticipants = new Set();
      const activeDays = new Set();

      // For each day in the week, get entries
      for (let d = new Date(startDate); d <= endDateObj; d.setDate(d.getDate() + 1)) {
        const dayStr = d.toISOString().split("T")[0];
        const dayEntries = await entryRepo.listByDateWithUsers(dayStr);

        if (dayEntries.length > 0) {
          activeDays.add(dayStr);
          dayEntries.forEach((e) => {
            uniqueParticipants.add(e.username);
            totalRating += e.rating;
            totalEntries++;
          });
        }
      }

      const avgRating = totalEntries > 0 ? totalRating / totalEntries : 0;

      // Format leaderboard (note: PostgreSQL returns lowercase column names)
      const leaderboard = weeklyLeaderboard.map((entry) => ({
        username: entry.username,
        avgRating: parseFloat(entry.avgrating),
        entries: parseInt(entry.entrycount, 10),
      }));

      logger?.debug("Weekly recap récupéré", {
        startDate,
        endDate,
        participantCount: uniqueParticipants.size,
      });

      return {
        startDate,
        endDate,
        participantCount: uniqueParticipants.size,
        avgRating: Math.round(avgRating * 10) / 10,
        activeDays: activeDays.size,
        leaderboard,
      };
    },

    /**
     * Get user recap stats by username (for bot)
     * @param {{ username: string }} params
     * @returns {Promise<Object>} User stats
     */
    async getUserRecapStats({ username }) {
      const user = await userRepo.findByUsername(username);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      return this.getUserStats({ userId: user.id });
    },

    /**
     * Get recap history (for bot)
     * @param {{ limit?: number }} params
     * @returns {Promise<Array>} Last N recaps
     */
    async getRecapHistory({ limit = 5 } = {}) {
      const today = getToday();
      const history = [];

      // Go back from today to get last N days with data
      const dateObj = new Date(today);
      let daysChecked = 0;
      const maxDaysToCheck = 60; // Don't go back more than 60 days

      while (history.length < limit && daysChecked < maxDaysToCheck) {
        const dateStr = dateObj.toISOString().split("T")[0];
        const entries = await entryRepo.listByDateWithUsers(dateStr);

        if (entries.length > 0) {
          const ratingsCount = await ratingRepo.countByDate(dateStr);
          const stats = calculateRecapStats(entries, ratingsCount);

          history.push({
            date: dateStr,
            participantCount: stats.participantCount,
            avgRating: stats.avgRating,
            ratingsGiven: stats.ratingsGiven,
          });
        }

        dateObj.setDate(dateObj.getDate() - 1);
        daysChecked++;
      }

      logger?.debug("Historique récupéré", { count: history.length });

      return history;
    },
  };
}
