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

  // Add entry
  router.post("/entries", authenticateToken, async (req, res, next) => {
    try {
      const { rating, description } = req.body;
      await entryService.saveEntry({ userId: req.user.id, rating, description });
      res.json({ message: "Saved" });
    } catch (err) {
      next(err);
    }
  });

  // Get next review (anonymous - no username returned)
  router.get("/review/next", authenticateToken, async (req, res, next) => {
    try {
      const result = await entryService.getNextReview({ userId: req.user.id });

      if (result.done) {
        return res.json({ done: true });
      }

      // Return entry WITHOUT username for anonymity (guessing game)
      res.json({
        userId: result.userId,
        date: result.date,
        rating: result.rating,
        description: result.description,
        // NOTE: username intentionally NOT included - it's a guessing game!
      });
    } catch (err) {
      next(err);
    }
  });

  // Add rating
  router.post("/ratings", authenticateToken, async (req, res, next) => {
    try {
      const { toUserId, date, rating } = req.body;
      await entryService.saveRating({ fromUserId: req.user.id, toUserId, date, rating });
      res.json({ message: "Rating saved" });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
