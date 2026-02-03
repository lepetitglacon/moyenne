/**
 * Auth Service - Authentication use cases (PostgreSQL)
 * Handles login, registration logic
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { validateCredentials } from "../domain/index.js";
import { ValidationError, AuthError, ConflictError } from "../shared/errors.js";

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
export function createAuthService({ userRepo, config, logger }) {
  return {
    /**
     * Register a new user
     * @param {{ username: string, password: string }} credentials
     * @returns {Promise<RegisterResult>}
     * @throws {ValidationError} If credentials are invalid
     * @throws {ConflictError} If username already taken
     */
    async register({ username, password }) {
      // Validate input
      const validation = validateCredentials({ username, password });
      if (!validation.valid) {
        throw new ValidationError(validation.error);
      }

      // Check if username exists
      if (await userRepo.existsByUsername(username)) {
        throw new ConflictError("Username already taken");
      }

      // Hash password and create user
      const passwordHash = bcrypt.hashSync(password, 10);
      const result = await userRepo.create(username, passwordHash);

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
  };
}
