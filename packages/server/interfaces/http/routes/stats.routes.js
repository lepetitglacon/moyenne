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

  // Get leaderboard
  router.get("/leaderboard", authenticateToken, (req, res, next) => {
    try {
      const leaderboard = statsService.getLeaderboard({
        month: req.query.month,
      });
      res.json(leaderboard);
    } catch (err) {
      next(err);
    }
  });

  // Get graph data for current user
  router.get("/me/graphs", authenticateToken, (req, res, next) => {
    try {
      const year = req.query.year ? Number(req.query.year) : undefined;
      const data = statsService.getGraphData({
        userId: req.user.id,
        year,
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  // Get graph data for another user
  router.get("/users/:id/graphs", authenticateToken, (req, res, next) => {
    const userIdValidation = validateUserId(req.params.id);
    if (!userIdValidation.valid) {
      return res.status(400).json({ message: userIdValidation.error });
    }

    try {
      const year = req.query.year ? Number(req.query.year) : undefined;
      const data = statsService.getGraphData({
        userId: Number(req.params.id),
        year,
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
