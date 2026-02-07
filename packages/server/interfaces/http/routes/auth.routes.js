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
      const result = await authService.login({ username, password });
      res.json({
        token: result.token,
        refreshToken: result.refreshToken,
        user: result.user,
      });
    } catch (err) {
      next(err);
    }
  });

  // Register
  router.post("/register", async (req, res, next) => {
    try {
      const { username, password, email } = req.body;
      await authService.register({ username, password, email });
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

  // Forgot password
  router.post("/forgot-password", async (req, res, next) => {
    try {
      const { email } = req.body;
      await authService.requestPasswordReset({ email });
      // Always return success to not reveal if email exists
      res.json({ message: "Si cet email existe, un lien de réinitialisation a été envoyé" });
    } catch (err) {
      next(err);
    }
  });

  // Reset password with token
  router.post("/reset-password", async (req, res, next) => {
    try {
      const { token, newPassword } = req.body;
      await authService.resetPassword({ token, newPassword });
      res.json({ message: "Mot de passe réinitialisé avec succès" });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
