/**
 * Badge Service - Badge/Achievement logic
 * Handles badge calculations and awarding
 */

/**
 * Badge definitions with metadata
 */
export const BADGE_DEFINITIONS = {
  streak_7: {
    id: 'streak_7',
    name: '7 jours de suite',
    description: 'Premier streak d\'une semaine',
    icon: '🔥',
    requirement: 7,
  },
  streak_30: {
    id: 'streak_30',
    name: 'Mois parfait',
    description: '30 jours consecutifs',
    icon: '🏆',
    requirement: 30,
  },
  top_1_monthly: {
    id: 'top_1_monthly',
    name: 'Top 1',
    description: 'Premiere place du leaderboard mensuel',
    icon: '🥇',
  },
  perfect_20: {
    id: 'perfect_20',
    name: '20/20',
    description: 'Premiere note parfaite',
    icon: '⭐',
  },
  reviewer_100: {
    id: 'reviewer_100',
    name: 'Reviewer',
    description: '100 ratings donnes',
    icon: '📝',
    requirement: 100,
  },
};

/**
 * @typedef {Object} BadgeDependencies
 * @property {import('../infrastructure/repositories/badge.repository.js').BadgeRepository} badgeRepo
 * @property {import('../infrastructure/repositories/entry.repository.js').EntryRepository} entryRepo
 * @property {import('../infrastructure/repositories/rating.repository.js').RatingRepository} ratingRepo
 * @property {import('../logger.js').Logger} [logger]
 */

/**
 * Create badge service instance
 * @param {BadgeDependencies} deps
 */
export function createBadgeService({ badgeRepo, entryRepo, ratingRepo, logger }) {
  return {
    /**
     * Get all badge definitions
     * @returns {Object}
     */
    getBadgeDefinitions() {
      return BADGE_DEFINITIONS;
    },

    /**
     * Get badges for a user with full info
     * @param {number} userId
     * @returns {Promise<Array>}
     */
    async getUserBadges(userId) {
      const userBadges = await badgeRepo.getByUser(userId);
      return userBadges.map(badge => ({
        ...BADGE_DEFINITIONS[badge.badge_type],
        earnedAt: badge.earned_at,
        metadata: badge.metadata,
      }));
    },

    /**
     * Check and award streak badges
     * @param {number} userId
     * @param {number} currentStreak
     * @returns {Promise<string[]>} - List of newly awarded badges
     */
    async checkStreakBadges(userId, currentStreak) {
      const awarded = [];

      if (currentStreak >= 7) {
        const has7 = await badgeRepo.hasBadge(userId, 'streak_7');
        if (!has7) {
          await badgeRepo.award(userId, 'streak_7', { streak: currentStreak });
          awarded.push('streak_7');
          logger?.info('Badge attribue: streak_7', { userId, streak: currentStreak });
        }
      }

      if (currentStreak >= 30) {
        const has30 = await badgeRepo.hasBadge(userId, 'streak_30');
        if (!has30) {
          await badgeRepo.award(userId, 'streak_30', { streak: currentStreak });
          awarded.push('streak_30');
          logger?.info('Badge attribue: streak_30', { userId, streak: currentStreak });
        }
      }

      return awarded;
    },

    /**
     * Check and award rating badge (20/20)
     * @param {number} userId
     * @param {number} rating
     * @returns {Promise<string[]>}
     */
    async checkRatingBadge(userId, rating) {
      const awarded = [];

      if (rating === 20) {
        const hasPerfect = await badgeRepo.hasBadge(userId, 'perfect_20');
        if (!hasPerfect) {
          await badgeRepo.award(userId, 'perfect_20', { firstPerfectDate: new Date().toISOString().split('T')[0] });
          awarded.push('perfect_20');
          logger?.info('Badge attribue: perfect_20', { userId });
        }
      }

      return awarded;
    },

    /**
     * Check and award reviewer badge
     * @param {number} userId
     * @returns {Promise<string[]>}
     */
    async checkReviewerBadge(userId) {
      const awarded = [];

      const totalRatings = await ratingRepo.countByUser(userId);

      if (totalRatings >= 100) {
        const hasReviewer = await badgeRepo.hasBadge(userId, 'reviewer_100');
        if (!hasReviewer) {
          await badgeRepo.award(userId, 'reviewer_100', { totalRatings });
          awarded.push('reviewer_100');
          logger?.info('Badge attribue: reviewer_100', { userId, totalRatings });
        }
      }

      return awarded;
    },

    /**
     * Check and award top 1 monthly badge
     * @param {number} userId
     * @param {string} month - YYYY-MM
     * @returns {Promise<string[]>}
     */
    async checkTop1Badge(userId, month) {
      const awarded = [];

      const hasTop1 = await badgeRepo.hasBadge(userId, 'top_1_monthly');
      if (!hasTop1) {
        await badgeRepo.award(userId, 'top_1_monthly', { month });
        awarded.push('top_1_monthly');
        logger?.info('Badge attribue: top_1_monthly', { userId, month });
      }

      return awarded;
    },

    /**
     * Check all possible badges for a user after an entry
     * @param {number} userId
     * @param {number} rating
     * @param {Object} streakInfo - { currentStreak, longestStreak }
     * @returns {Promise<string[]>}
     */
    async checkAllBadgesAfterEntry(userId, rating, streakInfo) {
      const allAwarded = [];

      const streakBadges = await this.checkStreakBadges(userId, streakInfo.currentStreak);
      allAwarded.push(...streakBadges);

      const ratingBadges = await this.checkRatingBadge(userId, rating);
      allAwarded.push(...ratingBadges);

      return allAwarded;
    },

    /**
     * Check badges after giving a rating
     * @param {number} userId
     * @returns {Promise<string[]>}
     */
    async checkAllBadgesAfterRating(userId) {
      return this.checkReviewerBadge(userId);
    },

    /**
     * Get progress towards badges for a user
     * @param {number} userId
     * @param {number} currentStreak
     * @returns {Promise<Object>}
     */
    async getBadgeProgress(userId, currentStreak) {
      const totalRatings = await ratingRepo.countByUser(userId);

      return {
        streak_7: {
          current: Math.min(currentStreak, 7),
          target: 7,
          percent: Math.min(100, Math.round((currentStreak / 7) * 100)),
        },
        streak_30: {
          current: Math.min(currentStreak, 30),
          target: 30,
          percent: Math.min(100, Math.round((currentStreak / 30) * 100)),
        },
        reviewer_100: {
          current: Math.min(totalRatings, 100),
          target: 100,
          percent: Math.min(100, Math.round((totalRatings / 100) * 100)),
        },
      };
    },
  };
}
