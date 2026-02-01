/**
 * Stats routes - user stats
 */

import express from "express";
import { validateUserId } from "../../../domain/index.js";

/**
 * Create stats routes
 * @param {{
 *   statsService: import('../../../application/stats.service.js').StatsService,
 *   authenticateToken: Function
 * }} deps
 */
export function createStatsRoutes({ statsService, authenticateToken }) {
  const router = express.Router();

  // Get my stats
  router.get("/me/stats", authenticateToken, (req, res, next) => {
    try {
      const stats = statsService.getMyStats({
        userId: req.user.id,
        month: req.query.month,
      });
      res.json(stats);
    } catch (err) {
      next(err);
    }
  });

  // Get user stats
  router.get("/users/:id/stats", authenticateToken, (req, res, next) => {
    const userIdValidation = validateUserId(req.params.id);
    if (!userIdValidation.valid) {
      return res.status(400).json({ message: userIdValidation.error });
    }

    try {
      const stats = statsService.getUserStats({
        userId: Number(req.params.id),
        month: req.query.month,
      });
      res.json(stats);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
