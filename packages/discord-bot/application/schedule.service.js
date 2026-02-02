/**
 * Schedule service - Manages recap scheduling
 */

const cron = require("node-cron");
const { validateTimeFormat, timeToCron } = require("../domain-bridge/time");
const { ValidationError, ConfigError } = require("../shared/errors");
const { DAYS_OF_WEEK, ALL_DAYS } = require("../shared/constants");

/**
 * Convert FR day abbreviations to cron day numbers
 * @param {string} daysStr - Comma-separated day abbreviations (e.g., "lun,mar,mer")
 * @returns {string} Cron day numbers (e.g., "1,2,3")
 */
function daysToCronDays(daysStr) {
  if (!daysStr || daysStr === ALL_DAYS) {
    return "*";
  }

  const days = daysStr.split(",").map((d) => d.trim().toLowerCase());
  const cronDays = days
    .map((d) => DAYS_OF_WEEK[d]?.index)
    .filter((d) => d !== undefined);

  if (cronDays.length === 0) {
    return "*";
  }

  // Check if all days are included
  if (cronDays.length === 7) {
    return "*";
  }

  return cronDays.join(",");
}

/**
 * Convert time and days to full cron expression
 * @param {string} time - Time in HH:MM format
 * @param {string} daysStr - Comma-separated day abbreviations
 * @returns {string} Full cron expression
 */
function timeToCronWithDays(time, daysStr) {
  const [hours, minutes] = time.split(":");
  const cronDays = daysToCronDays(daysStr);
  return `${minutes} ${hours} * * ${cronDays}`;
}

/**
 * Check if today is an active day
 * @param {string} daysStr - Comma-separated day abbreviations
 * @param {string} timezone - Timezone string
 * @returns {boolean}
 */
function isTodayActive(daysStr, timezone = "Europe/Paris") {
  if (!daysStr || daysStr === ALL_DAYS) {
    return true;
  }

  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: timezone,
  });
  const dayName = formatter.format(now).toLowerCase();

  // Map English day names to FR abbreviations
  const dayMap = {
    mon: "lun",
    tue: "mar",
    wed: "mer",
    thu: "jeu",
    fri: "ven",
    sat: "sam",
    sun: "dim",
  };

  const frDay = dayMap[dayName];
  const activeDays = daysStr.split(",").map((d) => d.trim().toLowerCase());

  return activeDays.includes(frDay);
}

/**
 * @param {{
 *   configRepo: import("../infrastructure/config.repository").ConfigRepository,
 *   logger: import("../logger").Logger
 * }} deps
 */
function createScheduleService({ configRepo, logger }) {
  let scheduledTask = null;

  return {
    /**
     * Get current schedule configuration
     */
    async getStatus() {
      const config = await configRepo.get();
      return {
        channelId: config?.channel_id || null,
        enabled: Boolean(config?.enabled),
        recapTime: config?.recap_time || "23:30",
        daysOfWeek: config?.days_of_week || ALL_DAYS,
        timezone: config?.timezone || "Europe/Paris",
      };
    },

    /**
     * Configure the recap channel
     */
    async setChannel({ channelId, guildId }) {
      await configRepo.update({
        channel_id: channelId,
        guild_id: guildId,
      });
      logger?.info("Canal configuré", { channelId });
    },

    /**
     * Set the recap time
     * @throws {ValidationError} If time format is invalid
     */
    async setTime(time) {
      const result = validateTimeFormat(time);
      if (!result.valid) {
        throw new ValidationError(result.error);
      }

      await configRepo.update({ recap_time: result.normalized });
      logger?.info("Heure configurée", { time: result.normalized });

      return result.normalized;
    },

    /**
     * Enable or disable automatic recaps
     */
    async setEnabled(enabled) {
      await configRepo.update({ enabled: enabled ? 1 : 0 });
      logger?.info(enabled ? "Récaps activés" : "Récaps désactivés");
    },

    /**
     * Start or restart the scheduler
     * @param {Function} onTick - Callback to execute on schedule
     */
    async start(onTick) {
      // Stop existing task if any
      if (scheduledTask) {
        scheduledTask.stop();
        scheduledTask = null;
      }

      const config = await configRepo.get();

      if (!config || !config.enabled) {
        logger?.info("Scheduler non démarré (désactivé)");
        return;
      }

      const recapTime = config.recap_time || "23:30";
      const daysOfWeek = config.days_of_week || ALL_DAYS;
      const timezone = config.timezone || "Europe/Paris";
      const cronExpression = timeToCronWithDays(recapTime, daysOfWeek);

      logger?.info(`Scheduler programmé pour ${recapTime}`, {
        cron: cronExpression,
        days: daysOfWeek,
        timezone,
      });

      scheduledTask = cron.schedule(
        cronExpression,
        () => {
          // Double-check if today is active (handles timezone edge cases)
          if (isTodayActive(daysOfWeek, timezone)) {
            logger?.info("Exécution du récap programmé");
            onTick();
          } else {
            logger?.info("Jour non actif, récap ignoré");
          }
        },
        {
          timezone,
        }
      );
    },

    /**
     * Stop the scheduler
     */
    stop() {
      if (scheduledTask) {
        scheduledTask.stop();
        scheduledTask = null;
        logger?.info("Scheduler arrêté");
      }
    },

    /**
     * Check if recap can be sent
     * @throws {ConfigError} If channel not configured
     */
    async validateCanSendRecap() {
      const config = await configRepo.get();
      if (!config?.channel_id) {
        throw new ConfigError(
          "Channel not configured",
          "Aucun canal configuré. Utilise `/recap config` d'abord."
        );
      }
      return config;
    },

    /**
     * Check if today is an active day for recaps
     * @returns {boolean}
     */
    async isTodayActive() {
      const config = await configRepo.get();
      const daysOfWeek = config?.days_of_week || ALL_DAYS;
      const timezone = config?.timezone || "Europe/Paris";
      return isTodayActive(daysOfWeek, timezone);
    },
  };
}

module.exports = { createScheduleService, daysToCronDays, isTodayActive };
