/**
 * Bot routes - Discord bot API endpoints
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
  router.get("/recap", authenticateBot, (req, res, next) => {
    try {
      const recap = statsService.getRecap({ date: req.query.date });
      res.json(recap);
    } catch (err) {
      next(err);
    }
  });

  // List users for bot
  router.get("/bot/users", authenticateBot, (req, res, next) => {
    try {
      const users = statsService.listUsers();
      res.json({ users });
    } catch (err) {
      next(err);
    }
  });

  // Check if user exists
  router.get("/bot/user/:username", authenticateBot, (req, res, next) => {
    try {
      const result = statsService.checkUserExists({ username: req.params.username });
      logger?.debug("Vérification utilisateur", { username: req.params.username, exists: result.exists });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
