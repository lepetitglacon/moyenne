/**
 * Users routes - user list (PostgreSQL async)
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
  router.get("/users", authenticateToken, async (req, res, next) => {
    try {
      const users = await statsService.listUsers();
      res.json({ users });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
