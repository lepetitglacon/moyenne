/**
 * Stats routes - user stats (PostgreSQL async)
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
  router.get("/me/stats", authenticateToken, async (req, res, next) => {
    try {
      const stats = await statsService.getMyStats({
        userId: req.user.id,
        month: req.query.month,
      });
      res.json(stats);
    } catch (err) {
      next(err);
    }
  });

  // Get user stats
  router.get("/users/:id/stats", authenticateToken, async (req, res, next) => {
    const userIdValidation = validateUserId(req.params.id);
    if (!userIdValidation.valid) {
      return res.status(400).json({ message: userIdValidation.error });
    }

    try {
      const stats = await statsService.getUserStats({
        userId: Number(req.params.id),
        month: req.query.month,
      });
      res.json(stats);
    } catch (err) {
      next(err);
    }
  });

  // Get leaderboard
  router.get("/leaderboard", authenticateToken, async (req, res, next) => {
    try {
      const leaderboard = await statsService.getLeaderboard({
        month: req.query.month,
      });
      res.json(leaderboard);
    } catch (err) {
      next(err);
    }
  });

  // Get graph data for current user
  router.get("/me/graphs", authenticateToken, async (req, res, next) => {
    try {
      const year = req.query.year ? Number(req.query.year) : undefined;
      const data = await statsService.getGraphData({
        userId: req.user.id,
        year,
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  // Get graph data for another user
  router.get("/users/:id/graphs", authenticateToken, async (req, res, next) => {
    const userIdValidation = validateUserId(req.params.id);
    if (!userIdValidation.valid) {
      return res.status(400).json({ message: userIdValidation.error });
    }

    try {
      const year = req.query.year ? Number(req.query.year) : undefined;
      const data = await statsService.getGraphData({
        userId: Number(req.params.id),
        year,
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  // Get tag stats for current user
  router.get("/me/tags-stats", authenticateToken, async (req, res, next) => {
    try {
      const data = await statsService.getTagStats({ userId: req.user.id });
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  // Get global tag stats
  router.get("/tags-stats", authenticateToken, async (req, res, next) => {
    try {
      const data = await statsService.getTagStats({});
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  // Get daily leaderboard
  router.get("/leaderboard/daily", authenticateToken, async (req, res, next) => {
    try {
      const data = await statsService.getDailyLeaderboard({
        date: req.query.date,
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  // Get detective leaderboard
  router.get("/leaderboard/detectives", authenticateToken, async (req, res, next) => {
    try {
      const data = await statsService.getDetectiveLeaderboard({
        limit: req.query.limit ? Number(req.query.limit) : 10,
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  // Get detective stats for current user
  router.get("/me/detective-stats", authenticateToken, async (req, res, next) => {
    try {
      const data = await statsService.getDetectiveStats({ userId: req.user.id });
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
