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

import { getToday, getYesterday, calculateStreak } from "../domain/index.js";
import { ValidationError } from "../shared/index.js";

/**
 * @typedef {Object} EntryDependencies
 * @property {import('../infrastructure/repositories/entry.repository.js').EntryRepository} entryRepo
 * @property {import('../infrastructure/repositories/rating.repository.js').RatingRepository} ratingRepo
 * @property {import('../infrastructure/repositories/assignment.repository.js').AssignmentRepository} assignmentRepo
 * @property {import('./badge.service.js').BadgeService} [badgeService]
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
export function createEntryService({ entryRepo, ratingRepo, assignmentRepo, guessRepo, badgeService, logger }) {
  // Helper to normalize date for streak calculation
  function normalizeDate(date) {
    if (!date) return null;
    if (date instanceof Date) return date.toISOString().split('T')[0];
    return String(date).split('T')[0];
  }

  return {
    /**
     * Save or update an entry for today
     * @param {{ userId: number, rating: number, description?: string, tags?: string[] }} params
     * @returns {Promise<SaveEntryResult & { newBadges?: string[] }>}
     */
    async saveEntry({ userId, rating, description, tags = [], gifUrl = null }) {
      const today = getToday();
      // Validate tags - only keep valid tag IDs
      const validTags = Array.isArray(tags) ? tags.filter(t => typeof t === 'string') : [];
      // Validate gifUrl - only keep valid URL strings
      const validGifUrl = typeof gifUrl === 'string' && gifUrl.trim() ? gifUrl.trim() : null;
      const { isUpdate } = await entryRepo.upsert(userId, today, rating, description, validTags, validGifUrl);

      if (isUpdate) {
        logger?.debug("Entree mise a jour", { userId, date: today, rating });
      } else {
        logger?.info("Nouvelle entree creee", { userId, date: today, rating });
      }

      // Check and award badges
      let newBadges = [];
      if (badgeService) {
        // Calculate streak for badge check
        const allEntriesRaw = await entryRepo.listAllByUser(userId);
        const allEntries = allEntriesRaw.map(e => ({ date: normalizeDate(e.date) }));
        const streakInfo = calculateStreak(allEntries, today);

        newBadges = await badgeService.checkAllBadgesAfterEntry(userId, rating, streakInfo);
        if (newBadges.length > 0) {
          logger?.info("Nouveaux badges attribues", { userId, badges: newBadges });
        }
      }

      return { isUpdate, newBadges };
    },

    /**
     * Get today's entry for a user
     * @param {{ userId: number }} params
     * @returns {Promise<{ exists: boolean, rating?: number, description?: string, tags?: string[] }>}
     */
    async getTodayEntry({ userId }) {
      const today = getToday();
      const entry = await entryRepo.findByUserAndDate(userId, today);

      if (!entry) {
        return { exists: false };
      }

      return {
        exists: true,
        rating: parseInt(entry.rating, 10) || 0,
        description: entry.description || '',
        tags: entry.tags || [],
        gifUrl: entry.gif_url || null,
      };
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
        description: entry.description,
        tags: entry.tags || [],
        gifUrl: entry.gif_url || null,
        // NOTE: No username or rating returned - it's a double guessing game!
        // The actual rating is stored for validation but not sent to client
        _actualRating: parseInt(entry.rating, 10) || 0,
      };
    },

    /**
     * Save a rating for another user's entry
     * - Only allows rating the assigned entry
     * - Only for yesterday's entries
     * - Can only rate once per day
     *
     * @param {{ fromUserId: number, toUserId: number, date: string, rating: number, guessedUserId?: number, guessedRating?: number }} params
     * @returns {Promise<{ newBadges: string[], guessResult?: { isCorrect: boolean, streak: number, stats: Object, actualRating: number, ratingGuessCorrect: boolean } }>}
     */
    async saveRating({ fromUserId, toUserId, date, rating, guessedUserId, guessedRating }) {
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
      logger?.info("Rating enregistre", { fromUserId, toUserId, date, rating });

      // Check and award reviewer badge
      let newBadges = [];
      if (badgeService) {
        newBadges = await badgeService.checkAllBadgesAfterRating(fromUserId);
        if (newBadges.length > 0) {
          logger?.info("Nouveaux badges attribues", { userId: fromUserId, badges: newBadges });
        }
      }

      // Get the actual entry to check rating guess
      const actualEntry = await entryRepo.findByUserAndDate(toUserId, date);
      const actualRating = actualEntry ? parseInt(actualEntry.rating, 10) || 0 : 0;

      // Handle guesses (author and/or rating)
      let guessResult = null;
      const hasAuthorGuess = guessedUserId !== null && guessedUserId !== undefined;
      const hasRatingGuess = guessedRating !== null && guessedRating !== undefined;

      if (hasAuthorGuess || hasRatingGuess) {
        // Check author guess
        let authorCorrect = false;
        let streak = 0;
        let stats = { totalGuesses: 0, correctGuesses: 0, accuracy: 0 };

        if (hasAuthorGuess && guessRepo) {
          const guessData = await guessRepo.save(fromUserId, toUserId, guessedUserId, date);
          authorCorrect = guessData.isCorrect;
          streak = guessData.streak;
          stats = await guessRepo.getStats(fromUserId);
        }

        // Check rating guess (exact match or within 1 point)
        const ratingGuessCorrect = hasRatingGuess && Math.abs(guessedRating - actualRating) <= 1;
        const ratingGuessExact = hasRatingGuess && guessedRating === actualRating;

        guessResult = {
          isCorrect: authorCorrect,
          streak,
          stats,
          actualUserId: toUserId,
          actualRating,
          guessedRating: hasRatingGuess ? guessedRating : null,
          ratingGuessCorrect,
          ratingGuessExact,
        };

        logger?.info("Guess enregistre", {
          fromUserId,
          guessedUserId,
          actualUserId: toUserId,
          authorCorrect,
          guessedRating,
          actualRating,
          ratingGuessCorrect,
          streak
        });

        // Check and award detective badges
        if (badgeService && hasAuthorGuess) {
          const detectiveBadges = await badgeService.checkAllBadgesAfterGuess(fromUserId);
          if (detectiveBadges.length > 0) {
            newBadges.push(...detectiveBadges);
            logger?.info("Nouveaux badges detective attribues", { userId: fromUserId, badges: detectiveBadges });
          }
        }
      }

      return { newBadges, guessResult };
    },
  };
}
