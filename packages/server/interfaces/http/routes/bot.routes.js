/**
 * Bot routes - Discord bot API endpoints (PostgreSQL async)
 */

import express from "express";

/**
 * Create bot routes
 * @param {{
 *   statsService: import('../../../application/stats.service.js').StatsService,
 *   authenticateBot: Function,
 *   logger: import('../../../logger.js').Logger
 * }} deps
 */
export function createBotRoutes({ statsService, authenticateBot, logger }) {
  const router = express.Router();

  // Get daily recap
  router.get("/recap", authenticateBot, async (req, res, next) => {
    try {
      const recap = await statsService.getRecap({ date: req.query.date });
      res.json(recap);
    } catch (err) {
      next(err);
    }
  });

  // Get weekly recap
  router.get("/recap/week", authenticateBot, async (req, res, next) => {
    try {
      const recap = await statsService.getWeeklyRecap({ date: req.query.date });
      res.json(recap);
    } catch (err) {
      next(err);
    }
  });

  // Get recap history
  router.get("/recap/history", authenticateBot, async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const history = await statsService.getRecapHistory({ limit });
      res.json(history);
    } catch (err) {
      next(err);
    }
  });

  // Get user stats by username (for bot)
  router.get("/recap/stats/:username", authenticateBot, async (req, res, next) => {
    try {
      const stats = await statsService.getUserRecapStats({ username: req.params.username });
      logger?.debug("Stats utilisateur récupérées", { username: req.params.username });
      res.json(stats);
    } catch (err) {
      next(err);
    }
  });

  // Get leaderboard
  router.get("/recap/leaderboard", authenticateBot, async (req, res, next) => {
    try {
      const leaderboard = await statsService.getLeaderboard({ month: req.query.month });
      res.json(leaderboard);
    } catch (err) {
      next(err);
    }
  });

  // List users for bot
  router.get("/bot/users", authenticateBot, async (req, res, next) => {
    try {
      const users = await statsService.listUsers();
      res.json({ users });
    } catch (err) {
      next(err);
    }
  });

  // Check if user exists
  router.get("/bot/user/:username", authenticateBot, async (req, res, next) => {
    try {
      const result = await statsService.checkUserExists({ username: req.params.username });
      logger?.debug("Vérification utilisateur", { username: req.params.username, exists: result.exists });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // Get daily leaderboard
  router.get("/recap/leaderboard/daily", authenticateBot, async (req, res, next) => {
    try {
      const data = await statsService.getDailyLeaderboard({ date: req.query.date });
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  // Get detective leaderboard
  router.get("/recap/leaderboard/detectives", authenticateBot, async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const data = await statsService.getDetectiveLeaderboard({ limit });
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
