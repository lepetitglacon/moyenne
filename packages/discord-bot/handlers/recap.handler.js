/**
 * Recap command handlers (PostgreSQL - Async)
 */

const { PermissionFlagsBits } = require("discord.js");
const { ADMIN_SUBCOMMANDS } = require("../commands");
const { replySuccess, replyError, handleError } = require("../shared/reply");
const {
  DISPLAY_MODE_LIST,
  DAYS_OF_WEEK,
  REMINDER_DEFAULTS,
} = require("../shared/constants");
const {
  MESSAGES,
  formatMessage,
  buildStatusMessage,
} = require("../shared/messages");

/**
 * Validate hex color format
 */
function isValidHexColor(color) {
  if (!color) return true;
  const hex = color.replace("#", "");
  return /^[0-9A-Fa-f]{6}$/.test(hex);
}

/**
 * Normalize hex color (ensure # prefix)
 */
function normalizeHexColor(color) {
  if (!color) return null;
  const hex = color.replace("#", "").toUpperCase();
  return `#${hex}`;
}

/**
 * Validate days of week string
 */
function validateDays(daysStr) {
  if (!daysStr) return { valid: false, error: MESSAGES.INVALID_DAYS };

  const days = daysStr.toLowerCase().split(",").map((d) => d.trim());
  const validDays = Object.keys(DAYS_OF_WEEK);

  for (const day of days) {
    if (!validDays.includes(day)) {
      return { valid: false, error: MESSAGES.INVALID_DAYS };
    }
  }

  return { valid: true, normalized: days.join(",") };
}

/**
 * Validate timezone
 */
function isValidTimezone(tz) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {{
 *   scheduleService: import("../application/schedule.service").ScheduleService,
 *   userService: import("../application/user.service").UserService,
 *   recapService: import("../application/recap.service").RecapService,
 *   reminderService?: import("../application/reminder.service").ReminderService,
 *   embedBuilderService?: import("../application/embed-builder.service").EmbedBuilderService,
 *   configRepo: import("../infrastructure/config.repository").ConfigRepository,
 *   apiClient: import("../api"),
 *   logger: import("../logger").Logger
 * }} deps
 */
function createRecapHandler({
  scheduleService,
  userService,
  recapService,
  reminderService,
  embedBuilderService,
  configRepo,
  apiClient,
  logger,
}) {
  return {
    /**
     * Handle recap command interactions
     */
    async handle(interaction, client) {
      const subcommand = interaction.options.getSubcommand();

      // Check admin permissions
      if (ADMIN_SUBCOMMANDS.includes(subcommand)) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          await replyError(interaction, MESSAGES.NO_PERMISSION);
          return;
        }
      }

      try {
        switch (subcommand) {
          // Configuration commands
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
          case "mode":
            await this._handleMode(interaction);
            break;
          case "title":
            await this._handleTitle(interaction);
            break;
          case "color":
            await this._handleColor(interaction);
            break;
          case "footer":
            await this._handleFooter(interaction);
            break;
          case "days":
            await this._handleDays(interaction, client);
            break;
          case "timezone":
            await this._handleTimezone(interaction);
            break;
          case "reminder":
            await this._handleReminder(interaction, client);
            break;
          case "reminder-time":
            await this._handleReminderTime(interaction, client);
            break;
          case "reminder-message":
            await this._handleReminderMessage(interaction);
            break;
          case "mention":
            await this._handleMention(interaction);
            break;
          case "min-participants":
            await this._handleMinParticipants(interaction);
            break;
          case "reset":
            await this._handleReset(interaction);
            break;

          // Recap commands
          case "preview":
            await this._handlePreview(interaction);
            break;
          case "weekly":
            await this._handleWeekly(interaction);
            break;
          case "stats":
            await this._handleStats(interaction);
            break;
          case "leaderboard":
            await this._handleLeaderboard(interaction);
            break;
          case "history":
            await this._handleHistory(interaction);
            break;
          case "daily":
            await this._handleDaily(interaction);
            break;
          case "detectives":
            await this._handleDetectives(interaction);
            break;

          // User commands
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

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURATION HANDLERS
    // ═══════════════════════════════════════════════════════════════

    async _handleConfig(interaction) {
      const channel = interaction.options.getChannel("canal");

      await scheduleService.setChannel({
        channelId: channel.id,
        guildId: interaction.guildId,
      });

      await replySuccess(
        interaction,
        formatMessage(MESSAGES.CONFIG_SAVED, { details: `Canal : ${channel}` })
      );
    },

    async _handleNow(interaction, client) {
      await interaction.deferReply({ ephemeral: true });

      await scheduleService.validateCanSendRecap();

      const success = await recapService.send(client);

      if (success) {
        await replySuccess(interaction, MESSAGES.RECAP_SENT);
      } else {
        await replyError(interaction, MESSAGES.API_ERROR);
      }
    },

    async _handleStatus(interaction) {
      const config = await configRepo.get();
      const statusMessage = buildStatusMessage(config);
      await replySuccess(interaction, statusMessage);
    },

    async _handleToggle(interaction, client, enabled) {
      await scheduleService.setEnabled(enabled);
      await scheduleService.start(() => recapService.send(client));

      await replySuccess(interaction, enabled ? MESSAGES.ENABLED : MESSAGES.DISABLED);
    },

    async _handleTime(interaction, client) {
      const time = interaction.options.getString("heure");
      const normalizedTime = await scheduleService.setTime(time);
      await scheduleService.start(() => recapService.send(client));

      await replySuccess(
        interaction,
        formatMessage(MESSAGES.TIME_SET, { time: normalizedTime })
      );
    },

    async _handleMode(interaction) {
      const mode = interaction.options.getString("mode");

      if (!DISPLAY_MODE_LIST.includes(mode)) {
        await replyError(interaction, MESSAGES.INVALID_MODE);
        return;
      }

      await configRepo.update({ display_mode: mode });
      await replySuccess(
        interaction,
        formatMessage(MESSAGES.MODE_SET, { mode })
      );
    },

    async _handleTitle(interaction) {
      const title = interaction.options.getString("titre");

      if (title) {
        await configRepo.update({ custom_title: title });
        await replySuccess(
          interaction,
          formatMessage(MESSAGES.TITLE_SET, { title })
        );
      } else {
        await configRepo.update({ custom_title: null });
        await replySuccess(interaction, MESSAGES.TITLE_RESET);
      }
    },

    async _handleColor(interaction) {
      const color = interaction.options.getString("couleur");

      if (color) {
        if (!isValidHexColor(color)) {
          await replyError(interaction, MESSAGES.INVALID_COLOR);
          return;
        }
        const normalized = normalizeHexColor(color);
        await configRepo.update({ custom_color: normalized });
        await replySuccess(
          interaction,
          formatMessage(MESSAGES.COLOR_SET, { color: normalized })
        );
      } else {
        await configRepo.update({ custom_color: null });
        await replySuccess(interaction, MESSAGES.COLOR_RESET);
      }
    },

    async _handleFooter(interaction) {
      const footer = interaction.options.getString("texte");

      if (footer) {
        await configRepo.update({ custom_footer: footer });
        await replySuccess(
          interaction,
          formatMessage(MESSAGES.FOOTER_SET, { footer })
        );
      } else {
        await configRepo.update({ custom_footer: null });
        await replySuccess(interaction, MESSAGES.FOOTER_RESET);
      }
    },

    async _handleDays(interaction, client) {
      const daysStr = interaction.options.getString("jours");
      const result = validateDays(daysStr);

      if (!result.valid) {
        await replyError(interaction, result.error);
        return;
      }

      await configRepo.update({ days_of_week: result.normalized });
      await scheduleService.start(() => recapService.send(client));

      await replySuccess(
        interaction,
        formatMessage(MESSAGES.DAYS_SET, { days: result.normalized })
      );
    },

    async _handleTimezone(interaction) {
      const tz = interaction.options.getString("tz");

      if (!isValidTimezone(tz)) {
        await replyError(interaction, MESSAGES.INVALID_TIMEZONE);
        return;
      }

      await configRepo.update({ timezone: tz });
      await replySuccess(
        interaction,
        formatMessage(MESSAGES.TIMEZONE_SET, { timezone: tz })
      );
    },

    async _handleReminder(interaction, client) {
      const state = interaction.options.getString("etat");
      const enabled = state === "on";

      await configRepo.update({ reminder_enabled: enabled ? 1 : 0 });

      if (reminderService) {
        if (enabled) {
          await reminderService.start(client);
        } else {
          reminderService.stop();
        }
      }

      if (enabled) {
        const config = await configRepo.get();
        await replySuccess(
          interaction,
          formatMessage(MESSAGES.REMINDER_ON, {
            minutes: config.reminder_minutes || REMINDER_DEFAULTS.minutes,
          })
        );
      } else {
        await replySuccess(interaction, MESSAGES.REMINDER_OFF);
      }
    },

    async _handleReminderTime(interaction, client) {
      const minutes = interaction.options.getInteger("minutes");

      if (minutes < REMINDER_DEFAULTS.minMinutes || minutes > REMINDER_DEFAULTS.maxMinutes) {
        await replyError(interaction, MESSAGES.INVALID_MINUTES);
        return;
      }

      await configRepo.update({ reminder_minutes: minutes });

      if (reminderService) {
        await reminderService.start(client);
      }

      await replySuccess(
        interaction,
        formatMessage(MESSAGES.REMINDER_TIME_SET, { minutes })
      );
    },

    async _handleReminderMessage(interaction) {
      const message = interaction.options.getString("message");

      await configRepo.update({ reminder_message: message || null });

      if (message) {
        await replySuccess(
          interaction,
          formatMessage(MESSAGES.CONFIG_SAVED, { details: `Message de rappel : ${message}` })
        );
      } else {
        await replySuccess(
          interaction,
          formatMessage(MESSAGES.CONFIG_SAVED, { details: "Message de rappel réinitialisé" })
        );
      }
    },

    async _handleMention(interaction) {
      const role = interaction.options.getRole("role");

      if (role) {
        await configRepo.update({ mention_role_id: role.id });
        await replySuccess(
          interaction,
          formatMessage(MESSAGES.MENTION_SET, { role: `<@&${role.id}>` })
        );
      } else {
        await configRepo.update({ mention_role_id: null });
        await replySuccess(interaction, MESSAGES.MENTION_RESET);
      }
    },

    async _handleMinParticipants(interaction) {
      const count = interaction.options.getInteger("nombre");

      if (count < 0) {
        await replyError(interaction, MESSAGES.INVALID_MIN_PARTICIPANTS);
        return;
      }

      await configRepo.update({ min_participants: count });
      await replySuccess(
        interaction,
        formatMessage(MESSAGES.MIN_PARTICIPANTS_SET, { count })
      );
    },

    async _handleReset(interaction) {
      await configRepo.reset();
      await replySuccess(interaction, MESSAGES.CONFIG_RESET);
    },

    // ═══════════════════════════════════════════════════════════════
    // RECAP HANDLERS
    // ═══════════════════════════════════════════════════════════════

    async _handlePreview(interaction) {
      await interaction.deferReply({ ephemeral: true });

      try {
        const data = await apiClient.getDayRecap();
        const config = await configRepo.get();

        if (!embedBuilderService) {
          await replyError(interaction, "Service non disponible.");
          return;
        }

        const embed = await embedBuilderService.build(data, config);
        await interaction.editReply({
          content: MESSAGES.PREVIEW_HEADER,
          embeds: [embed],
        });
      } catch (error) {
        logger?.error("Erreur preview", { error: error.message });
        await replyError(interaction, MESSAGES.API_ERROR);
      }
    },

    async _handleWeekly(interaction) {
      await interaction.deferReply({ ephemeral: false });

      try {
        const data = await apiClient.getWeekRecap();
        const config = await configRepo.get();

        if (!embedBuilderService) {
          await replyError(interaction, "Service non disponible.");
          return;
        }

        const embed = await embedBuilderService.buildWeekly(data, config);
        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        logger?.error("Erreur weekly", { error: error.message });
        await replyError(interaction, MESSAGES.API_ERROR);
      }
    },

    async _handleStats(interaction) {
      await interaction.deferReply({ ephemeral: false });

      try {
        const usernameOption = interaction.options.getString("username");
        let username = usernameOption;

        // If no username provided, try to get linked account
        if (!username) {
          const discordId = interaction.user.id;
          const linked = await userService.getLinkedUsername(discordId);
          if (linked) {
            username = linked;
          } else {
            await replyError(
              interaction,
              "Aucun nom d'utilisateur fourni et ton compte n'est pas lié. Utilise `/recap link` d'abord ou fournis un nom d'utilisateur."
            );
            return;
          }
        }

        const data = await apiClient.getUserStats(username);
        const config = await configRepo.get();

        if (!embedBuilderService) {
          await replyError(interaction, "Service non disponible.");
          return;
        }

        const embed = await embedBuilderService.buildUserStats(data, username, config);
        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        logger?.error("Erreur stats", { error: error.message });
        if (error.message?.includes("not found")) {
          await replyError(
            interaction,
            formatMessage(MESSAGES.USER_NOT_FOUND, {
              username: interaction.options.getString("username"),
            })
          );
        } else {
          await replyError(interaction, MESSAGES.API_ERROR);
        }
      }
    },

    async _handleLeaderboard(interaction) {
      await interaction.deferReply({ ephemeral: false });

      try {
        const data = await apiClient.getLeaderboard();
        const config = await configRepo.get();

        if (!embedBuilderService) {
          await replyError(interaction, "Service non disponible.");
          return;
        }

        const embed = await embedBuilderService.buildLeaderboard(data, config);
        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        logger?.error("Erreur leaderboard", { error: error.message });
        await replyError(interaction, MESSAGES.API_ERROR);
      }
    },

    async _handleHistory(interaction) {
      await interaction.deferReply({ ephemeral: false });

      try {
        const limit = interaction.options.getInteger("nombre") || 5;
        const data = await apiClient.getRecapHistory(limit);
        const config = await configRepo.get();

        if (!embedBuilderService) {
          await replyError(interaction, "Service non disponible.");
          return;
        }

        const embed = await embedBuilderService.buildHistory(data, config);
        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        logger?.error("Erreur history", { error: error.message });
        await replyError(interaction, MESSAGES.API_ERROR);
      }
    },

    async _handleDaily(interaction) {
      await interaction.deferReply({ ephemeral: false });

      try {
        const dateOption = interaction.options.getString("date");
        const data = await apiClient.getDailyLeaderboard(dateOption);
        const config = await configRepo.get();

        if (!embedBuilderService) {
          await replyError(interaction, "Service non disponible.");
          return;
        }

        const embed = await embedBuilderService.buildDailyLeaderboard(data, config);
        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        logger?.error("Erreur daily", { error: error.message });
        await replyError(interaction, MESSAGES.API_ERROR);
      }
    },

    async _handleDetectives(interaction) {
      await interaction.deferReply({ ephemeral: false });

      try {
        const data = await apiClient.getDetectiveLeaderboard(10);
        const config = await configRepo.get();

        if (!embedBuilderService) {
          await replyError(interaction, "Service non disponible.");
          return;
        }

        const embed = await embedBuilderService.buildDetectiveLeaderboard(data, config);
        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        logger?.error("Erreur detectives", { error: error.message });
        await replyError(interaction, MESSAGES.API_ERROR);
      }
    },

    // ═══════════════════════════════════════════════════════════════
    // USER HANDLERS
    // ═══════════════════════════════════════════════════════════════

    async _handleLink(interaction) {
      const username = interaction.options.getString("username");
      const discordId = interaction.user.id;

      await interaction.deferReply({ ephemeral: true });

      const result = await userService.link({ discordId, tiltUsername: username });

      await replySuccess(
        interaction,
        formatMessage(MESSAGES.LINKED, { username: result.tiltUsername })
      );
    },

    async _handleUnlink(interaction) {
      const discordId = interaction.user.id;

      await userService.unlink(discordId);

      await replySuccess(interaction, MESSAGES.UNLINKED);
    },
  };
}

module.exports = { createRecapHandler };
