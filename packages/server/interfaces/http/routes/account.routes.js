/**
 * Account routes - authenticated user account management
 */

import express from "express";

/**
 * Create account routes
 * @param {{ authService: Object, authenticateToken: Function }} deps
 */
export function createAccountRoutes({ authService, authenticateToken }) {
  const router = express.Router();

  // Get current user profile
  router.get("/account/me", authenticateToken, async (req, res, next) => {
    try {
      const user = await authService.getProfile(req.user.id);
      res.json(user);
    } catch (err) {
      next(err);
    }
  });

  // Change password
  router.put("/account/password", authenticateToken, async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword({
        userId: req.user.id,
        currentPassword,
        newPassword,
      });
      res.json({ message: "Mot de passe mis à jour" });
    } catch (err) {
      next(err);
    }
  });

  // Update email
  router.put("/account/email", authenticateToken, async (req, res, next) => {
    try {
      const { email } = req.body;
      await authService.updateEmail({
        userId: req.user.id,
        email,
      });
      res.json({ message: "Email mis à jour" });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
