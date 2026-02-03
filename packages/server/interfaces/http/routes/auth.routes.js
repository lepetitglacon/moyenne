/**
 * Auth routes - login/register (PostgreSQL async)
 */

import express from "express";

/**
 * Create auth routes
 * @param {{ authService: import('../../../application/auth.service.js').AuthService }} deps
 */
export function createAuthRoutes({ authService }) {
  const router = express.Router();

  // Login
  router.post("/login", async (req, res, next) => {
    try {
      const { username, password } = req.body;
      const { token } = await authService.login({ username, password });
      res.json({ token });
    } catch (err) {
      next(err);
    }
  });

  // Register
  router.post("/register", async (req, res, next) => {
    try {
      const { username, password } = req.body;
      await authService.register({ username, password });
      res.json({ message: "User created" });
    } catch (err) {
      next(err);
    }
  });

  // Refresh token
  router.post("/refresh", async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken({ refreshToken });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
