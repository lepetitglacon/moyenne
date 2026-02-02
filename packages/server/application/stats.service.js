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
 * @property {import('./badge.service.js').BadgeService} [badgeService]
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
export function createStatsService({ userRepo, entryRepo, ratingRepo, badgeService, logger }) {
  /**
   * Get stats for a user (internal helper)
   * @param {number} userId
   * @param {string|undefined} monthParam
   * @returns {Promise<UserStatsResult>}
   */
  // Helper to normalize date (PostgreSQL returns Date objects)
  function normalizeDate(date) {
    if (!date) return null;
    if (date instanceof Date) return date.toISOString().split('T')[0];
    return String(date).split('T')[0];
  }

  // Helper to normalize entry data
  function normalizeEntry(entry) {
    if (!entry) return null;
    return {
      date: normalizeDate(entry.date),
      rating: parseInt(entry.rating, 10) || 0,
      description: entry.description || null,
    };
  }

  async function getUserStatsInternal(userId, monthParam) {
    const today = getToday();
    const { monthStart, monthEnd } = getMonthRange(monthParam);

    const lastEntry = await entryRepo.getLastByUser(userId);
    const todayEntry = await entryRepo.findByUserAndDate(userId, today);
    const participationCount = await entryRepo.countByUser(userId);
    const currentMonthAvg = await entryRepo.getAvgByUserAndRange(userId, monthStart, monthEnd);
    const monthEntriesRaw = await entryRepo.listByUserAndRange(userId, monthStart, monthEnd);

    // Calculate streak
    const allEntriesRaw = await entryRepo.listAllByUser(userId);
    // Normalize dates for streak calculation
    const allEntries = allEntriesRaw.map(e => ({ date: normalizeDate(e.date) }));
    const streakData = calculateStreak(allEntries, today);

    // Normalize month entries
    const monthEntries = monthEntriesRaw.map(e => ({
      date: normalizeDate(e.date),
      rating: parseInt(e.rating, 10) || 0,
    }));

    return {
      today,
      monthStart,
      monthEnd,
      lastEntry: normalizeEntry(lastEntry),
      todayEntry: normalizeEntry(todayEntry),
      participationCount: parseInt(participationCount, 10) || 0,
      currentMonthAvg: currentMonthAvg ? parseFloat(currentMonthAvg) : null,
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
      const stats = await getUserStatsInternal(userId, month);

      // Get badges and progress
      let badges = [];
      let badgeProgress = {};
      if (badgeService) {
        badges = await badgeService.getUserBadges(userId);
        badgeProgress = await badgeService.getBadgeProgress(userId, stats.streak.currentStreak);
      }

      return {
        ...stats,
        badges,
        badgeProgress,
      };
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

      // Get badges
      let badges = [];
      if (badgeService) {
        badges = await badgeService.getUserBadges(userId);
      }

      return {
        user,
        ...stats,
        badges,
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
      const entriesRaw = await entryRepo.listByDateWithUsers(recapDate);

      // Normalize entries (PostgreSQL may return ratings as strings)
      const entries = entriesRaw.map(e => ({
        ...e,
        rating: parseInt(e.rating, 10) || 0,
        date: normalizeDate(e.date),
      }));

      // Get ratings count
      const ratingsCount = await ratingRepo.countByDate(recapDate);

      // Calculate stats via domain
      const stats = calculateRecapStats(entries, ratingsCount);

      logger?.debug("Récap récupéré", { date: recapDate, participantCount: stats.participantCount });

      return {
        date: recapDate,
        ...stats,
        // Include full entries array for FULL display mode
        entries: entries.map(e => ({
          username: e.username,
          rating: e.rating,
          description: e.description || null,
        })),
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

      const monthlyRaw = await entryRepo.getLeaderboardByAvg(monthStart, monthEnd);
      const allTimeRaw = await entryRepo.getLeaderboardAllTime();
      const topParticipantsRaw = await entryRepo.getLeaderboardByParticipation();

      // Normalize PostgreSQL results (lowercase columns → camelCase, strings → numbers)
      const normalizeLeaderboard = (rows) => rows.map(row => ({
        userId: parseInt(row.userid, 10),
        username: row.username,
        avgRating: parseFloat(row.avgrating) || 0,
        entryCount: parseInt(row.entrycount, 10) || 0,
      }));

      return {
        monthStart,
        monthEnd,
        monthly: normalizeLeaderboard(monthlyRaw),
        allTime: normalizeLeaderboard(allTimeRaw),
        topParticipants: normalizeLeaderboard(topParticipantsRaw),
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
      const userMonthlyRaw = await entryRepo.getMonthlyAverages(userId, 12);

      // Global monthly averages for comparison
      const globalMonthlyRaw = await entryRepo.getGlobalMonthlyAverages(12);

      // Year entries for heatmap
      const yearEntriesRaw = await entryRepo.getYearEntries(userId, currentYear);

      // Rating distribution
      const distributionRaw = await entryRepo.getRatingDistribution(userId);

      // Average by day of week
      const byDayOfWeekRaw = await entryRepo.getAverageByDayOfWeek(userId);

      // Global average for comparison
      const globalAverage = await entryRepo.getGlobalAverage();

      // Normalize PostgreSQL results (lowercase columns → camelCase, strings → numbers)
      const normalizeMonthly = (rows) => rows.map(row => ({
        month: row.month,
        avgRating: parseFloat(row.avgrating) || 0,
        entryCount: parseInt(row.entrycount, 10) || 0,
      }));

      const normalizeYearEntries = (rows) => rows.map(row => ({
        date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
        rating: parseInt(row.rating, 10) || 0,
      }));

      const normalizeDistribution = (rows) => rows.map(row => ({
        rating: parseInt(row.rating, 10),
        count: parseInt(row.count, 10) || 0,
      }));

      const normalizeByDayOfWeek = (rows) => rows.map(row => ({
        dayOfWeek: parseInt(row.dayofweek, 10),
        avgRating: parseFloat(row.avgrating) || 0,
        entryCount: parseInt(row.entrycount, 10) || 0,
      }));

      return {
        year: currentYear,
        userMonthly: normalizeMonthly(userMonthlyRaw),
        globalMonthly: normalizeMonthly(globalMonthlyRaw),
        yearEntries: normalizeYearEntries(yearEntriesRaw),
        distribution: normalizeDistribution(distributionRaw),
        byDayOfWeek: normalizeByDayOfWeek(byDayOfWeekRaw),
        globalAverage: globalAverage ? parseFloat(globalAverage) : null,
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
            totalRating += parseInt(e.rating, 10) || 0;
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
        const entriesRaw = await entryRepo.listByDateWithUsers(dateStr);

        if (entriesRaw.length > 0) {
          // Normalize entries for calculateRecapStats
          const entries = entriesRaw.map(e => ({
            ...e,
            rating: parseInt(e.rating, 10) || 0,
          }));

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
