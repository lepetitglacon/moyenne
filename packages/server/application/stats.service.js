/**
 * Stats Service - Statistics use cases
 * Handles user stats, recap generation
 */

import {
  getToday,
  getMonthRange,
  calculateRecapStats,
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
 * @typedef {Object} UserStatsResult
 * @property {string} today
 * @property {string} monthStart
 * @property {string} monthEnd
 * @property {{ date: string, rating: number, description: string|null }|null} lastEntry
 * @property {{ date: string, rating: number, description: string|null }|null} todayEntry
 * @property {number} participationCount
 * @property {number|null} currentMonthAvg
 * @property {{ date: string, rating: number }[]} monthEntries
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
   * @returns {UserStatsResult}
   */
  function getUserStatsInternal(userId, monthParam) {
    const today = getToday();
    const { monthStart, monthEnd } = getMonthRange(monthParam);

    const lastEntry = entryRepo.getLastByUser(userId);
    const todayEntry = entryRepo.findByUserAndDate(userId, today);
    const participationCount = entryRepo.countByUser(userId);
    const currentMonthAvg = entryRepo.getAvgByUserAndRange(userId, monthStart, monthEnd);
    const monthEntries = entryRepo.listByUserAndRange(userId, monthStart, monthEnd);

    return {
      today,
      monthStart,
      monthEnd,
      lastEntry: lastEntry || null,
      todayEntry: todayEntry || null,
      participationCount,
      currentMonthAvg,
      monthEntries,
    };
  }

  return {
    /**
     * Get stats for current user
     * @param {{ userId: number, month?: string }} params
     * @returns {UserStatsResult}
     */
    getMyStats({ userId, month }) {
      return getUserStatsInternal(userId, month);
    },

    /**
     * Get stats for another user
     * @param {{ userId: number, month?: string }} params
     * @returns {UserStatsResult & { user: { id: number, username: string } }}
     * @throws {NotFoundError} If user doesn't exist
     */
    getUserStats({ userId, month }) {
      const user = userRepo.findById(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      const stats = getUserStatsInternal(userId, month);

      return {
        user,
        ...stats,
      };
    },

    /**
     * Get daily recap (for bot)
     * @param {{ date?: string }} params
     * @returns {RecapResult}
     */
    getRecap({ date } = {}) {
      const recapDate = date || getToday();

      // Get entries with user info
      const entries = entryRepo.listByDateWithUsers(recapDate);

      // Get ratings count
      const ratingsCount = ratingRepo.countByDate(recapDate);

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
     * @returns {{ id: number, username: string }[]}
     */
    listUsers() {
      return userRepo.listAll();
    },

    /**
     * Check if a user exists by username
     * @param {{ username: string }} params
     * @returns {{ exists: boolean, user: { id: number, username: string }|null }}
     */
    checkUserExists({ username }) {
      const user = userRepo.findByUsername(username);
      return {
        exists: !!user,
        user: user || null,
      };
    },

    /**
     * Get leaderboard data
     * @param {{ month?: string }} params
     * @returns {{ monthly: Array, allTime: Array, topParticipants: Array, monthLabel: string }}
     */
    getLeaderboard({ month } = {}) {
      const { monthStart, monthEnd } = getMonthRange(month);

      const monthly = entryRepo.getLeaderboardByAvg(monthStart, monthEnd);
      const allTime = entryRepo.getLeaderboardAllTime();
      const topParticipants = entryRepo.getLeaderboardByParticipation();

      return {
        monthStart,
        monthEnd,
        monthly,
        allTime,
        topParticipants,
      };
    },
  };
}
