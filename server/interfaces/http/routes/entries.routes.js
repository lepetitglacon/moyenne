/**
 * Entries routes - entries, reviews, ratings
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
  router.post("/entries", authenticateToken, (req, res, next) => {
    try {
      const { rating, description } = req.body;
      entryService.saveEntry({ userId: req.user.id, rating, description });
      res.json({ message: "Saved" });
    } catch (err) {
      next(err);
    }
  });

  // Get next review
  router.get("/review/next", authenticateToken, (req, res, next) => {
    try {
      const result = entryService.getNextReview({ userId: req.user.id });

      if (result.done) {
        return res.json({ done: true });
      }

      res.json({
        userId: result.userId,
        username: result.username,
        date: result.date,
        rating: result.rating,
        description: result.description,
      });
    } catch (err) {
      next(err);
    }
  });

  // Add rating
  router.post("/ratings", authenticateToken, (req, res, next) => {
    try {
      const { toUserId, date, rating } = req.body;
      entryService.saveRating({ fromUserId: req.user.id, toUserId, date, rating });
      res.json({ message: "Rating saved" });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
