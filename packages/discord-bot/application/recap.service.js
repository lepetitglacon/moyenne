/**
 * Recap service - Orchestrates daily recap sending
 */

const { EmbedBuilder } = require("discord.js");
const { ApiError } = require("../shared/errors");

/**
 * @param {{
 *   scheduleService: import("./schedule.service").ScheduleService,
 *   userService: import("./user.service").UserService,
 *   apiClient: import("../api"),
 *   logger: import("../logger").Logger
 * }} deps
 */
function createRecapService({ scheduleService, userService, apiClient, logger }) {
  return {
    /**
     * Send the daily recap to the configured channel
     * @param {import("discord.js").Client} client
     * @returns {Promise<boolean>} Success status
     */
    async send(client) {
      try {
        const config = scheduleService.validateCanSendRecap();

        const channel = await client.channels.fetch(config.channel_id);
        if (!channel) {
          logger?.error("Canal non trouvé", { channelId: config.channel_id });
          return false;
        }

        const data = await apiClient.getDayRecap();
        const embed = this.buildEmbed(data);

        await channel.send({ embeds: [embed] });
        logger?.info("Récap envoyé avec succès");
        return true;
      } catch (error) {
        logger?.error("Erreur envoi récap", { error: error.message });
        return false;
      }
    },

    /**
     * Build the Discord embed for the recap
     * @param {Object} data - Recap data from API
     * @returns {EmbedBuilder}
     */
    buildEmbed(data) {
      const dateFormatted = new Date(data.date).toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const embed = new EmbedBuilder()
        .setColor(this._getColorForRating(data.avgRating))
        .setTitle(`RECAP DU JOUR - ${dateFormatted}`)
        .setTimestamp();

      // No participants
      if (data.participantCount === 0) {
        embed.setDescription("Aucune participation aujourd'hui... Revenez demain !");
        return embed;
      }

      // Get user links for mentions
      const linkMap = userService.getAllLinksMap();

      // General stats
      embed.addFields(
        {
          name: "Participants",
          value: `${data.participantCount}`,
          inline: true,
        },
        {
          name: "Moyenne du jour",
          value: `${data.avgRating}/20 ${this._getRatingEmoji(data.avgRating)}`,
          inline: true,
        },
        {
          name: "Ratings donnés",
          value: `${data.ratingsGiven}`,
          inline: true,
        }
      );

      // Top 3
      if (data.top3 && data.top3.length > 0) {
        const medals = ["🥇", "🥈", "🥉"];
        const top3Text = data.top3
          .map((entry, i) => {
            const discordId = linkMap.get(entry.username.toLowerCase());
            const mention = discordId ? `<@${discordId}>` : `**${entry.username}**`;
            return `${medals[i]} ${mention} - ${entry.rating}/20`;
          })
          .join("\n");

        embed.addFields({
          name: "Podium",
          value: top3Text,
          inline: false,
        });
      }

      // Best comment
      const bestWithComment = data.top3?.find(
        (e) => e.description && e.description.trim().length > 0
      );
      if (bestWithComment) {
        const truncatedDesc =
          bestWithComment.description.length > 200
            ? bestWithComment.description.substring(0, 200) + "..."
            : bestWithComment.description;
        embed.addFields({
          name: `Moment fort de ${bestWithComment.username}`,
          value: `"${truncatedDesc}"`,
          inline: false,
        });
      }

      embed.setFooter({ text: "A demain !" });

      return embed;
    },

    _getColorForRating(rating) {
      if (rating >= 16) return 0x22c55e; // Green
      if (rating >= 12) return 0x84cc16; // Light green
      if (rating >= 8) return 0xeab308; // Yellow
      if (rating >= 4) return 0xf97316; // Orange
      return 0xef4444; // Red
    },

    _getRatingEmoji(rating) {
      if (rating >= 16) return "🔥";
      if (rating >= 12) return "😊";
      if (rating >= 8) return "😐";
      if (rating >= 4) return "😕";
      return "😢";
    },
  };
}

module.exports = { createRecapService };
