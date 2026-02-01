/**
 * User service - Manages Discord-Tilt user links
 */

const { NotFoundError } = require("../shared/errors");

/**
 * @param {{
 *   userLinkRepo: import("../infrastructure/user-link.repository").UserLinkRepository,
 *   apiClient: import("../api"),
 *   logger: import("../logger").Logger
 * }} deps
 */
function createUserService({ userLinkRepo, apiClient, logger }) {
  return {
    /**
     * Link a Discord user to a Tilt account
     * @throws {NotFoundError} If Tilt user doesn't exist
     */
    async link({ discordId, tiltUsername }) {
      // Verify user exists on Tilt
      const exists = await apiClient.checkUser(tiltUsername);

      if (!exists) {
        throw new NotFoundError(
          `Tilt user not found: ${tiltUsername}`,
          `Aucun compte Tilt trouvé avec le nom "${tiltUsername}"`
        );
      }

      userLinkRepo.link(discordId, tiltUsername);
      logger?.info("Compte lié", { discordId, tiltUsername });

      return { tiltUsername };
    },

    /**
     * Unlink a Discord user from Tilt
     * @throws {NotFoundError} If no link exists
     */
    unlink(discordId) {
      const existing = userLinkRepo.findByDiscordId(discordId);

      if (!existing) {
        throw new NotFoundError(
          "No link found",
          "Ton compte Discord n'est lié à aucun compte Tilt."
        );
      }

      userLinkRepo.unlink(discordId);
      logger?.info("Compte délié", { discordId });
    },

    /**
     * Get all user links (for recap mentions)
     * @returns {Map<string, string>} Map of lowercase tiltUsername -> discordId
     */
    getAllLinksMap() {
      const links = userLinkRepo.findAll();
      return new Map(
        links.map((l) => [l.tilt_username.toLowerCase(), l.discord_id])
      );
    },
  };
}

module.exports = { createUserService };
