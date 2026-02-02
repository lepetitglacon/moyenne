/**
 * Entries routes - entries, reviews, ratings (PostgreSQL async)
 */

import express from "express";

/**
 * Create entries routes
 * @param {{
 *   entryService: import('../../../application/entry.service.js').EntryService,
 *   authenticateToken: Function
 * }} deps
 */
export function createEntriesRoutes({ entryService, authenticateToken }) {
  const router = express.Router();

  // Get today's entry (for editing)
  router.get("/entries/today", authenticateToken, async (req, res, next) => {
    try {
      const entry = await entryService.getTodayEntry({ userId: req.user.id });
      res.json(entry || { exists: false });
    } catch (err) {
      next(err);
    }
  });

  // Add entry
  router.post("/entries", authenticateToken, async (req, res, next) => {
    try {
      const { rating, description, tags } = req.body;
      const result = await entryService.saveEntry({ userId: req.user.id, rating, description, tags });
      res.json({ message: "Saved", newBadges: result.newBadges || [] });
    } catch (err) {
      next(err);
    }
  });

  // Get next review (anonymous - no username or rating returned for guessing game)
  router.get("/review/next", authenticateToken, async (req, res, next) => {
    try {
      const result = await entryService.getNextReview({ userId: req.user.id });

      if (result.done) {
        return res.json({ done: true });
      }

      // Return entry WITHOUT username and WITHOUT rating for guessing game
      // Tags are shown to help guess the author
      res.json({
        userId: result.userId,
        date: result.date,
        description: result.description,
        tags: result.tags || [],
        // NOTE: username and rating intentionally NOT included - it's a guessing game!
      });
    } catch (err) {
      next(err);
    }
  });

  // Add rating (with optional guess for author and rating)
  router.post("/ratings", authenticateToken, async (req, res, next) => {
    try {
      const { toUserId, date, rating, guessedUserId, guessedRating } = req.body;
      const result = await entryService.saveRating({
        fromUserId: req.user.id,
        toUserId,
        date,
        rating,
        guessedUserId: guessedUserId || null,
        guessedRating: guessedRating !== undefined ? guessedRating : null,
      });

      res.json({
        message: "Rating saved",
        newBadges: result.newBadges || [],
        guessResult: result.guessResult || null,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
