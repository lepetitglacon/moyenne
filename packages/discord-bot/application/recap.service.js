/**
 * Recap service - Orchestrates daily recap sending
 */

const { MESSAGES, formatMessage } = require("../shared/messages");

/**
 * @param {{
 *   scheduleService: import("./schedule.service").ScheduleService,
 *   userService: import("./user.service").UserService,
 *   embedBuilderService: import("./embed-builder.service").EmbedBuilderService,
 *   configRepo: import("../infrastructure/config.repository").ConfigRepository,
 *   apiClient: import("../api"),
 *   logger: import("../logger").Logger
 * }} deps
 */
function createRecapService({
  scheduleService,
  userService,
  embedBuilderService,
  configRepo,
  apiClient,
  logger,
}) {
  return {
    /**
     * Send the daily recap to the configured channel
     * @param {import("discord.js").Client} client
     * @returns {Promise<boolean>} Success status
     */
    async send(client) {
      try {
        const config = await scheduleService.validateCanSendRecap();

        const channel = await client.channels.fetch(config.channel_id);
        if (!channel) {
          logger?.error("Canal non trouvé", { channelId: config.channel_id });
          return false;
        }

        const data = await apiClient.getDayRecap();

        // Check minimum participants
        const minParticipants = config.min_participants || 0;
        if (data.participantCount < minParticipants) {
          logger?.info("Pas assez de participants, récap annulé", {
            participants: data.participantCount,
            min: minParticipants,
          });
          return false;
        }

        // Build embed using the embed builder service
        const embed = await embedBuilderService.build(data, config);

        // Build message content (with optional role mention)
        let content = null;
        if (config.mention_role_id && data.participantCount > 0) {
          content = `<@&${config.mention_role_id}>`;
        }

        await channel.send({
          content,
          embeds: [embed],
        });

        logger?.info("Récap envoyé avec succès", {
          mode: config.display_mode || "top3",
          participants: data.participantCount,
        });
        return true;
      } catch (error) {
        logger?.error("Erreur envoi récap", { error: error.message });
        return false;
      }
    },

    /**
     * Get recap data for preview
     * @returns {Promise<Object>} Recap data
     */
    async getPreviewData() {
      return apiClient.getDayRecap();
    },
  };
}

module.exports = { createRecapService };
