/**
 * Bot API Key authentication middleware
 */

/**
 * Create bot API key authentication middleware
 * @param {{ botApiKey: string }} config
 * @param {import('../../../logger.js').Logger} [logger]
 */
export function createBotAuthMiddleware(config, logger) {
  return (req, res, next) => {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || apiKey !== config.botApiKey) {
      logger?.warning("Clé API invalide");
      return res.status(401).json({ message: "Invalid API key" });
    }

    next();
  };
}
