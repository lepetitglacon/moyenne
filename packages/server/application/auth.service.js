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
 * @property {string} token
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

      // Generate token
      const token = jwt.sign(
        { id: user.id, username: user.username },
        config.secretKey,
        { expiresIn: "2h" }
      );

      logger?.info("Connexion réussie", { username });

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
        },
      };
    },
  };
}
