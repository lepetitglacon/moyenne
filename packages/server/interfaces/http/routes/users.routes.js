/**
 * Users routes - user list
 */

import express from "express";

/**
 * Create users routes
 * @param {{
 *   statsService: import('../../../application/stats.service.js').StatsService,
 *   authenticateToken: Function
 * }} deps
 */
export function createUsersRoutes({ statsService, authenticateToken }) {
  const router = express.Router();

  // List users
  router.get("/users", authenticateToken, (req, res, next) => {
    try {
      const users = statsService.listUsers();
      res.json({ users });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
