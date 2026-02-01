/**
 * Auth routes - login/register
 */

import express from "express";

/**
 * Create auth routes
 * @param {{ authService: import('../../../application/auth.service.js').AuthService }} deps
 */
export function createAuthRoutes({ authService }) {
  const router = express.Router();

  // Login
  router.post("/login", (req, res, next) => {
    try {
      const { username, password } = req.body;
      const { token } = authService.login({ username, password });
      res.json({ token });
    } catch (err) {
      next(err);
    }
  });

  // Register
  router.post("/register", (req, res, next) => {
    try {
      const { username, password } = req.body;
      authService.register({ username, password });
      res.json({ message: "User created" });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
