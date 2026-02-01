/**
 * Recap command handlers
 */

const { PermissionFlagsBits } = require("discord.js");
const { ADMIN_SUBCOMMANDS } = require("../commands");
const { replySuccess, replyError, handleError } = require("../shared/reply");

/**
 * @param {{
 *   scheduleService: import("../application/schedule.service").ScheduleService,
 *   userService: import("../application/user.service").UserService,
 *   recapService: import("../application/recap.service").RecapService,
 *   logger: import("../logger").Logger
 * }} deps
 */
function createRecapHandler({ scheduleService, userService, recapService, logger }) {
  return {
    /**
     * Handle recap command interactions
     */
    async handle(interaction, client) {
      const subcommand = interaction.options.getSubcommand();

      // Check admin permissions
      if (ADMIN_SUBCOMMANDS.includes(subcommand)) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          await replyError(interaction, "Cette commande est réservée aux administrateurs.");
          return;
        }
      }

      try {
        switch (subcommand) {
          case "config":
            await this._handleConfig(interaction);
            break;
          case "now":
            await this._handleNow(interaction, client);
            break;
          case "status":
            await this._handleStatus(interaction);
            break;
          case "enable":
            await this._handleToggle(interaction, client, true);
            break;
          case "disable":
            await this._handleToggle(interaction, client, false);
            break;
          case "time":
            await this._handleTime(interaction, client);
            break;
          case "link":
            await this._handleLink(interaction);
            break;
          case "unlink":
            await this._handleUnlink(interaction);
            break;
        }
      } catch (error) {
        await handleError(interaction, error, logger);
      }
    },

    async _handleConfig(interaction) {
      const channel = interaction.options.getChannel("canal");

      scheduleService.setChannel({
        channelId: channel.id,
        guildId: interaction.guildId,
      });

      await replySuccess(interaction, `Le récap sera publié dans ${channel}`);
    },

    async _handleNow(interaction, client) {
      await interaction.deferReply({ ephemeral: true });

      scheduleService.validateCanSendRecap();

      const success = await recapService.send(client);

      if (success) {
        await replySuccess(interaction, "Récap envoyé !");
      } else {
        await replyError(interaction, "Erreur lors de l'envoi du récap. Vérifie les logs.");
      }
    },

    async _handleStatus(interaction) {
      const status = scheduleService.getStatus();

      const channelMention = status.channelId
        ? `<#${status.channelId}>`
        : "Non configuré";
      const statusText = status.enabled ? "Activé" : "Désactivé";

      await replySuccess(
        interaction,
        [
          "**Configuration du récap**",
          `Canal: ${channelMention}`,
          `Heure: ${status.recapTime}`,
          `Status: ${statusText}`,
        ].join("\n")
      );
    },

    async _handleToggle(interaction, client, enabled) {
      scheduleService.setEnabled(enabled);

      // Restart scheduler
      scheduleService.start(() => recapService.send(client));

      await replySuccess(
        interaction,
        enabled ? "Récaps automatiques activés" : "Récaps automatiques désactivés"
      );
    },

    async _handleTime(interaction, client) {
      const time = interaction.options.getString("heure");

      const normalizedTime = scheduleService.setTime(time);

      // Restart scheduler with new time
      scheduleService.start(() => recapService.send(client));

      await replySuccess(interaction, `Heure du récap configurée à ${normalizedTime}`);
    },

    async _handleLink(interaction) {
      const username = interaction.options.getString("username");
      const discordId = interaction.user.id;

      await interaction.deferReply({ ephemeral: true });

      const result = await userService.link({ discordId, tiltUsername: username });

      await replySuccess(
        interaction,
        `Ton compte Discord est maintenant lié au compte Tilt "${result.tiltUsername}" ! Tu seras mentionné dans les récaps.`
      );
    },

    async _handleUnlink(interaction) {
      const discordId = interaction.user.id;

      userService.unlink(discordId);

      await replySuccess(interaction, "Ton compte Discord a été délié de Tilt.");
    },
  };
}

module.exports = { createRecapHandler };
