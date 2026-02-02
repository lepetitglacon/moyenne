/**
 * Reminder Service - Manages pre-recap reminders
 */

const cron = require("node-cron");
const { REMINDER_DEFAULTS } = require("../shared/constants");
const { MESSAGES, formatMessage } = require("../shared/messages");

/**
 * Calculate reminder time based on recap time and minutes before
 * @param {string} recapTime - Recap time in HH:MM format
 * @param {number} minutesBefore - Minutes before recap to send reminder
 * @returns {{ hours: number, minutes: number }}
 */
function calculateReminderTime(recapTime, minutesBefore) {
  const [recapHours, recapMinutes] = recapTime.split(":").map(Number);

  let totalMinutes = recapHours * 60 + recapMinutes - minutesBefore;

  // Handle day wrap-around
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }

  return {
    hours: Math.floor(totalMinutes / 60) % 24,
    minutes: totalMinutes % 60,
  };
}

/**
 * @param {{
 *   configRepo: import("../infrastructure/config.repository").ConfigRepository,
 *   scheduleService: import("./schedule.service").ScheduleService,
 *   logger?: import("../logger").Logger
 * }} deps
 */
function createReminderService({ configRepo, scheduleService, logger }) {
  let reminderTask = null;

  return {
    /**
     * Start the reminder scheduler
     * @param {import("discord.js").Client} client - Discord client
     */
    start(client) {
      // Stop existing task if any
      this.stop();

      const config = configRepo.get();

      if (!config || !config.reminder_enabled) {
        logger?.info("Reminder non démarré (désactivé)");
        return;
      }

      if (!config.channel_id) {
        logger?.info("Reminder non démarré (pas de canal configuré)");
        return;
      }

      const recapTime = config.recap_time || "23:30";
      const minutesBefore = config.reminder_minutes || REMINDER_DEFAULTS.minutes;
      const timezone = config.timezone || "Europe/Paris";

      const reminderTime = calculateReminderTime(recapTime, minutesBefore);
      const cronExpression = `${reminderTime.minutes} ${reminderTime.hours} * * *`;

      logger?.info(
        `Reminder programmé ${minutesBefore} min avant le récap (${reminderTime.hours}:${String(reminderTime.minutes).padStart(2, "0")})`,
        { cron: cronExpression }
      );

      reminderTask = cron.schedule(
        cronExpression,
        async () => {
          // Check if today is active
          if (!scheduleService.isTodayActive()) {
            logger?.info("Jour non actif, reminder ignoré");
            return;
          }

          await this.sendReminder(client);
        },
        {
          timezone,
        }
      );
    },

    /**
     * Stop the reminder scheduler
     */
    stop() {
      if (reminderTask) {
        reminderTask.stop();
        reminderTask = null;
        logger?.info("Reminder arrêté");
      }
    },

    /**
     * Send the reminder message
     * @param {import("discord.js").Client} client - Discord client
     */
    async sendReminder(client) {
      try {
        const config = configRepo.get();

        if (!config?.channel_id) {
          logger?.warn("Impossible d'envoyer le reminder: pas de canal");
          return;
        }

        const channel = await client.channels.fetch(config.channel_id);
        if (!channel) {
          logger?.error("Canal non trouvé pour le reminder", {
            channelId: config.channel_id,
          });
          return;
        }

        // Build message
        let message;
        if (config.reminder_message) {
          message = formatMessage(MESSAGES.REMINDER_CUSTOM, {
            message: config.reminder_message,
          });
        } else {
          const minutesBefore = config.reminder_minutes || REMINDER_DEFAULTS.minutes;
          message = formatMessage(MESSAGES.REMINDER, {
            minutes: minutesBefore,
          });
        }

        // Add role mention if configured
        let content = message;
        if (config.mention_role_id) {
          content = `<@&${config.mention_role_id}>\n\n${message}`;
        }

        await channel.send(content);
        logger?.info("Reminder envoyé avec succès");
      } catch (error) {
        logger?.error("Erreur envoi reminder", { error: error.message });
      }
    },

    /**
     * Test send a reminder (for debugging)
     * @param {import("discord.js").Client} client - Discord client
     */
    async testReminder(client) {
      logger?.info("Test reminder...");
      await this.sendReminder(client);
    },
  };
}

module.exports = { createReminderService, calculateReminderTime };
