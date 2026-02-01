/**
 * Entry Service - Entry and rating use cases
 * Handles saving entries, getting reviews, saving ratings
 */

import { getToday, getYesterday } from "../domain/index.js";
import { ValidationError } from "../shared/index.js";

/**
 * @typedef {Object} EntryDependencies
 * @property {import('../infrastructure/repositories/entry.repository.js').EntryRepository} entryRepo
 * @property {import('../infrastructure/repositories/rating.repository.js').RatingRepository} ratingRepo
 * @property {import('../logger.js').Logger} [logger]
 */

/**
 * @typedef {Object} SaveEntryResult
 * @property {boolean} isUpdate
 */

/**
 * @typedef {Object} NextReviewResult
 * @property {boolean} done
 * @property {number} [userId]
 * @property {string} [username]
 * @property {string} [date]
 * @property {number} [rating]
 * @property {string|null} [description]
 */

/**
 * Create entry service instance
 * @param {EntryDependencies} deps
 */
export function createEntryService({ entryRepo, ratingRepo, logger }) {
  return {
    /**
     * Save or update an entry for today
     * @param {{ userId: number, rating: number, description?: string }} params
     * @returns {SaveEntryResult}
     */
    saveEntry({ userId, rating, description }) {
      const today = getToday();
      const { isUpdate } = entryRepo.upsert(userId, today, rating, description);

      if (isUpdate) {
        logger?.debug("Entrée mise à jour", { userId, date: today, rating });
      } else {
        logger?.info("Nouvelle entrée créée", { userId, date: today, rating });
      }

      return { isUpdate };
    },

    /**
     * Get next entry to review for a user
     * Returns entries from yesterday only (users rate previous day's entries)
     * @param {{ userId: number }} params
     * @returns {NextReviewResult}
     */
    getNextReview({ userId }) {
      const yesterday = getYesterday();
      const entry = entryRepo.findNextReviewForUser(userId, yesterday);

      if (!entry) {
        return { done: true };
      }

      return {
        done: false,
        userId: entry.user_id,
        username: entry.username,
        date: entry.date,
        rating: entry.rating,
        description: entry.description,
      };
    },

    /**
     * Save a rating for another user's entry
     * Only allows rating entries from yesterday
     * @param {{ fromUserId: number, toUserId: number, date: string, rating: number }} params
     */
    saveRating({ fromUserId, toUserId, date, rating }) {
      const yesterday = getYesterday();
      if (date !== yesterday) {
        throw new ValidationError("Tu ne peux noter que les entrées de la veille");
      }
      ratingRepo.create(fromUserId, toUserId, date, rating);
      logger?.info("Rating enregistré", { fromUserId, toUserId, date, rating });
    },
  };
}
