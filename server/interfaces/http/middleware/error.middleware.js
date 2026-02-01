/**
 * Centralized error handling middleware
 * Maps typed errors to HTTP responses
 */

import {
  ValidationError,
  AuthError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "../../../shared/errors.js";

/**
 * Create error handling middleware
 * @param {import('../../../logger.js').Logger} [logger]
 */
export function createErrorMiddleware(logger) {
  return (err, req, res, next) => {
    // Already sent response
    if (res.headersSent) {
      return next(err);
    }

    // Map typed errors to HTTP codes
    if (err instanceof ValidationError) {
      return res.status(400).json({ message: err.message });
    }

    if (err instanceof ConflictError) {
      return res.status(400).json({ message: err.message });
    }

    if (err instanceof AuthError) {
      return res.status(401).json({ message: err.message });
    }

    if (err instanceof ForbiddenError) {
      return res.status(403).json({ message: err.message });
    }

    if (err instanceof NotFoundError) {
      return res.status(404).json({ message: err.message });
    }

    // Unknown error - log and return 500
    logger?.error("Erreur interne", { error: err.message, stack: err.stack });
    return res.status(500).json({ message: "Internal server error" });
  };
}

/**
 * Wrapper for async route handlers to catch errors
 * @param {Function} fn - Async route handler
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
