/**
 * Entry Service - Entry and rating use cases (PostgreSQL)
 * Handles saving entries, getting reviews, saving ratings
 *
 * Review system:
 * - Each user gets assigned exactly ONE entry to review per day
 * - Assignments are exclusive (no two users review the same entry)
 * - Reviews are anonymous (username is not revealed)
 * - Once rated, the user cannot review again that day
 */

import { getToday, getYesterday } from "../domain/index.js";
import { ValidationError } from "../shared/index.js";

/**
 * @typedef {Object} EntryDependencies
 * @property {import('../infrastructure/repositories/entry.repository.js').EntryRepository} entryRepo
 * @property {import('../infrastructure/repositories/rating.repository.js').RatingRepository} ratingRepo
 * @property {import('../infrastructure/repositories/assignment.repository.js').AssignmentRepository} assignmentRepo
 * @property {import('../logger.js').Logger} [logger]
 */

/**
 * @typedef {Object} SaveEntryResult
 * @property {boolean} isUpdate
 */

/**
 * @typedef {Object} NextReviewResult
 * @property {boolean} done - true if user has already reviewed or no entry available
 * @property {number} [userId] - The user ID to review (for submitting rating)
 * @property {string} [date] - The date of the entry
 * @property {number} [rating] - The rating of the entry
 * @property {string|null} [description] - The description (comment) to guess who wrote it
 */

/**
 * Create entry service instance
 * @param {EntryDependencies} deps
 */
export function createEntryService({ entryRepo, ratingRepo, assignmentRepo, logger }) {
  return {
    /**
     * Save or update an entry for today
     * @param {{ userId: number, rating: number, description?: string }} params
     * @returns {Promise<SaveEntryResult>}
     */
    async saveEntry({ userId, rating, description }) {
      const today = getToday();
      const { isUpdate } = await entryRepo.upsert(userId, today, rating, description);

      if (isUpdate) {
        logger?.debug("Entrée mise à jour", { userId, date: today, rating });
      } else {
        logger?.info("Nouvelle entrée créée", { userId, date: today, rating });
      }

      return { isUpdate };
    },

    /**
     * Get the entry to review for a user
     * - Only ONE entry per day
     * - Anonymous (no username returned)
     * - Exclusive assignment (no duplicates)
     *
     * @param {{ userId: number }} params
     * @returns {Promise<NextReviewResult>}
     */
    async getNextReview({ userId }) {
      const yesterday = getYesterday();

      // 1. Check if user has already rated for yesterday
      const hasRated = await assignmentRepo.hasRatedForDate(userId, yesterday);
      if (hasRated) {
        logger?.debug("Utilisateur a déjà noté", { userId, date: yesterday });
        return { done: true };
      }

      // 2. Check if user already has an assignment for yesterday
      let assignment = await assignmentRepo.getAssignmentForReviewer(userId, yesterday);

      // 3. If no assignment, try to create one
      if (!assignment) {
        const unassignedEntry = await assignmentRepo.findUnassignedEntry(userId, yesterday);

        if (!unassignedEntry) {
          // No more entries available to assign
          logger?.debug("Plus d'entrées disponibles", { userId, date: yesterday });
          return { done: true };
        }

        // Create the assignment
        await assignmentRepo.createAssignment(userId, unassignedEntry.user_id, yesterday);
        assignment = { reviewee_id: unassignedEntry.user_id };
        logger?.info("Attribution créée", { reviewer: userId, reviewee: unassignedEntry.user_id, date: yesterday });
      }

      // 4. Get the entry details (WITHOUT username for anonymity)
      const entry = await entryRepo.findByUserAndDate(assignment.reviewee_id, yesterday);

      if (!entry) {
        logger?.error("Entrée introuvable pour attribution", { reviewee: assignment.reviewee_id, date: yesterday });
        return { done: true };
      }

      return {
        done: false,
        userId: assignment.reviewee_id,
        date: yesterday,
        rating: parseInt(entry.rating, 10) || 0,
        description: entry.description,
        // NOTE: No username returned - it's anonymous!
      };
    },

    /**
     * Save a rating for another user's entry
     * - Only allows rating the assigned entry
     * - Only for yesterday's entries
     * - Can only rate once per day
     *
     * @param {{ fromUserId: number, toUserId: number, date: string, rating: number }} params
     * @returns {Promise<void>}
     */
    async saveRating({ fromUserId, toUserId, date, rating }) {
      const yesterday = getYesterday();

      // Validate date
      if (date !== yesterday) {
        throw new ValidationError("Tu ne peux noter que les entrées de la veille");
      }

      // Validate rating
      if (rating < 0 || rating > 20) {
        throw new ValidationError("La note doit être entre 0 et 20");
      }

      // Check if user has already rated
      const hasRated = await assignmentRepo.hasRatedForDate(fromUserId, date);
      if (hasRated) {
        throw new ValidationError("Tu as déjà noté pour ce jour");
      }

      // Check if this is the correct assignment
      const assignment = await assignmentRepo.getAssignmentForReviewer(fromUserId, date);
      if (!assignment || assignment.reviewee_id !== toUserId) {
        throw new ValidationError("Cette entrée ne t'a pas été attribuée");
      }

      // Save the rating
      await ratingRepo.create(fromUserId, toUserId, date, rating);
      logger?.info("Rating enregistré", { fromUserId, toUserId, date, rating });
    },
  };
}
