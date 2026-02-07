/**
 * Auth Service - Authentication use cases (PostgreSQL)
 * Handles login, registration logic
 */

import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { validateCredentials, validatePassword, validateEmail } from "../domain/index.js";
import { ValidationError, AuthError, ConflictError, NotFoundError } from "../shared/errors.js";

/**
 * @typedef {Object} AuthDependencies
 * @property {import('../infrastructure/repositories/user.repository.js').UserRepository} userRepo
 * @property {{ secretKey: string }} config
 * @property {import('../logger.js').Logger} [logger]
 */

/**
 * @typedef {Object} LoginResult
 * @property {string} token - Access token (short-lived)
 * @property {string} refreshToken - Refresh token (long-lived)
 * @property {{ id: number, username: string }} user
 */

/**
 * @typedef {Object} RegisterResult
 * @property {{ id: number, username: string }} user
 */

/**
 * Create auth service instance
 * @param {AuthDependencies} deps
 */
export function createAuthService({ userRepo, passwordResetRepo, emailService, config, logger }) {
  return {
    /**
     * Register a new user
     * @param {{ username: string, password: string, email?: string }} credentials
     * @returns {Promise<RegisterResult>}
     * @throws {ValidationError} If credentials are invalid
     * @throws {ConflictError} If username already taken
     */
    async register({ username, password, email }) {
      // Validate input
      const validation = validateCredentials({ username, password });
      if (!validation.valid) {
        throw new ValidationError(validation.error);
      }

      // Check if username exists
      if (await userRepo.existsByUsername(username)) {
        throw new ConflictError("Username already taken");
      }

      // Validate email if provided
      if (email) {
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
          throw new ValidationError(emailValidation.error);
        }
      }

      // Hash password and create user
      const passwordHash = bcrypt.hashSync(password, 10);
      const result = await userRepo.create(username, passwordHash);

      // Update email if provided
      if (email) {
        await userRepo.updateEmail(result.lastInsertRowid, email.trim());
      }

      logger?.info("Nouvel utilisateur créé", { username });

      return {
        user: {
          id: result.lastInsertRowid,
          username,
        },
      };
    },

    /**
     * Login user and return JWT token
     * @param {{ username: string, password: string }} credentials
     * @returns {Promise<LoginResult>}
     * @throws {ValidationError} If credentials are invalid format
     * @throws {AuthError} If credentials don't match
     */
    async login({ username, password }) {
      // Validate input
      const validation = validateCredentials({ username, password });
      if (!validation.valid) {
        throw new ValidationError(validation.error);
      }

      // Find user
      const user = await userRepo.findByUsernameWithPassword(username);
      if (!user) {
        logger?.debug("Utilisateur non trouvé", { username });
        throw new AuthError("Invalid credentials");
      }

      // Verify password
      if (!bcrypt.compareSync(password, user.password)) {
        logger?.debug("Mot de passe incorrect", { username });
        throw new AuthError("Invalid credentials");
      }

      // Generate access token (short-lived)
      const token = jwt.sign(
        { id: user.id, username: user.username },
        config.secretKey,
        { expiresIn: "2h" }
      );

      // Generate refresh token (long-lived)
      const refreshToken = jwt.sign(
        { id: user.id, username: user.username, type: "refresh" },
        config.secretKey,
        { expiresIn: "30d" }
      );

      logger?.info("Connexion réussie", { username });

      return {
        token,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
        },
      };
    },

    /**
     * Refresh access token using a valid refresh token
     * @param {{ refreshToken: string }} params
     * @returns {Promise<{ token: string, refreshToken: string }>}
     * @throws {AuthError} If refresh token is invalid or expired
     */
    async refreshToken({ refreshToken }) {
      if (!refreshToken) {
        throw new AuthError("Refresh token required");
      }

      try {
        // Verify refresh token
        const decoded = jwt.verify(refreshToken, config.secretKey);

        // Check it's a refresh token
        if (decoded.type !== "refresh") {
          throw new AuthError("Invalid token type");
        }

        // Verify user still exists
        const user = await userRepo.findById(decoded.id);
        if (!user) {
          throw new AuthError("User not found");
        }

        // Generate new access token
        const newToken = jwt.sign(
          { id: user.id, username: user.username },
          config.secretKey,
          { expiresIn: "2h" }
        );

        // Generate new refresh token (rotate for security)
        const newRefreshToken = jwt.sign(
          { id: user.id, username: user.username, type: "refresh" },
          config.secretKey,
          { expiresIn: "30d" }
        );

        logger?.debug("Token rafraîchi", { userId: user.id });

        return {
          token: newToken,
          refreshToken: newRefreshToken,
        };
      } catch (err) {
        if (err instanceof AuthError) throw err;
        logger?.debug("Refresh token invalide", { error: err.message });
        throw new AuthError("Invalid or expired refresh token");
      }
    },

    /**
     * Get user profile (id, username, email)
     * @param {number} userId
     */
    async getProfile(userId) {
      const user = await userRepo.findByIdWithPassword(userId);
      if (!user) {
        throw new NotFoundError("Utilisateur non trouvé");
      }
      return { id: user.id, username: user.username, email: user.email || null };
    },

    /**
     * Change password for authenticated user
     * @param {{ userId: number, currentPassword: string, newPassword: string }} params
     */
    async changePassword({ userId, currentPassword, newPassword }) {
      // Validate new password
      const validation = validatePassword(newPassword);
      if (!validation.valid) {
        throw new ValidationError(validation.error);
      }

      // Get user with password hash
      const user = await userRepo.findByIdWithPassword(userId);
      if (!user) {
        throw new NotFoundError("Utilisateur non trouvé");
      }

      // Verify current password
      if (!bcrypt.compareSync(currentPassword, user.password)) {
        throw new AuthError("Mot de passe actuel incorrect");
      }

      // Hash and update
      const passwordHash = bcrypt.hashSync(newPassword, 10);
      await userRepo.updatePassword(userId, passwordHash);

      logger?.info("Mot de passe changé", { userId });
    },

    /**
     * Request a password reset (sends email)
     * @param {{ email: string }} params
     */
    async requestPasswordReset({ email }) {
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        throw new ValidationError(emailValidation.error);
      }

      const user = await userRepo.findByEmail(email.trim());
      if (!user) {
        // Don't reveal whether the email exists
        logger?.debug("Reset demandé pour email inconnu", { email });
        return;
      }

      // Generate token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await passwordResetRepo.create(user.id, token, expiresAt);

      // Send email
      const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
      const sent = await emailService?.sendPasswordReset({ to: email.trim(), resetUrl });

      if (sent) {
        logger?.info("Email de reset envoyé", { userId: user.id });
      }
    },

    /**
     * Reset password using a token
     * @param {{ token: string, newPassword: string }} params
     */
    async resetPassword({ token, newPassword }) {
      const validation = validatePassword(newPassword);
      if (!validation.valid) {
        throw new ValidationError(validation.error);
      }

      const resetToken = await passwordResetRepo.findValidToken(token);
      if (!resetToken) {
        throw new AuthError("Token invalide ou expiré");
      }

      // Hash and update password
      const passwordHash = bcrypt.hashSync(newPassword, 10);
      await userRepo.updatePassword(resetToken.user_id, passwordHash);

      // Mark token as used
      await passwordResetRepo.markUsed(resetToken.id);

      logger?.info("Mot de passe réinitialisé via token", { userId: resetToken.user_id });
    },

    /**
     * Update user email
     * @param {{ userId: number, email: string }} params
     */
    async updateEmail({ userId, email }) {
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        throw new ValidationError(emailValidation.error);
      }

      // Check if email is already taken by another user
      const existing = await userRepo.findByEmail(email.trim());
      if (existing && existing.id !== userId) {
        throw new ConflictError("Cet email est déjà utilisé");
      }

      await userRepo.updateEmail(userId, email.trim());
      logger?.info("Email mis à jour", { userId });
    },
  };
}
