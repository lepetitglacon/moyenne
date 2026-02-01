/**
 * JWT Authentication middleware
 */

import jwt from "jsonwebtoken";

/**
 * Create JWT authentication middleware
 * @param {{ secretKey: string }} config
 * @param {import('../../../logger.js').Logger} [logger]
 */
export function createAuthMiddleware(config, logger) {
  return (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      logger?.debug("Token manquant");
      return res.sendStatus(401);
    }

    jwt.verify(token, config.secretKey, (err, user) => {
      if (err) {
        logger?.debug("Token invalide", { error: err.message });
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  };
}
