/**
 * Schedule service - Manages recap scheduling
 */

const cron = require("node-cron");
const { validateTimeFormat, timeToCron } = require("../domain-bridge/time");
const { ValidationError, ConfigError } = require("../shared/errors");

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
    getStatus() {
      const config = configRepo.get();
      return {
        channelId: config?.channel_id || null,
        enabled: Boolean(config?.enabled),
        recapTime: config?.recap_time || "23:30",
      };
    },

    /**
     * Configure the recap channel
     */
    setChannel({ channelId, guildId }) {
      configRepo.update({
        channel_id: channelId,
        guild_id: guildId,
      });
      logger?.info("Canal configuré", { channelId });
    },

    /**
     * Set the recap time
     * @throws {ValidationError} If time format is invalid
     */
    setTime(time) {
      const result = validateTimeFormat(time);
      if (!result.valid) {
        throw new ValidationError(result.error);
      }

      configRepo.update({ recap_time: result.normalized });
      logger?.info("Heure configurée", { time: result.normalized });

      return result.normalized;
    },

    /**
     * Enable or disable automatic recaps
     */
    setEnabled(enabled) {
      configRepo.update({ enabled: enabled ? 1 : 0 });
      logger?.info(enabled ? "Récaps activés" : "Récaps désactivés");
    },

    /**
     * Start or restart the scheduler
     * @param {Function} onTick - Callback to execute on schedule
     */
    start(onTick) {
      // Stop existing task if any
      if (scheduledTask) {
        scheduledTask.stop();
        scheduledTask = null;
      }

      const config = configRepo.get();

      if (!config || !config.enabled) {
        logger?.info("Scheduler non démarré (désactivé)");
        return;
      }

      const recapTime = config.recap_time || "23:30";
      const cronExpression = timeToCron(recapTime);

      logger?.info(`Scheduler programmé pour ${recapTime}`, { cron: cronExpression });

      scheduledTask = cron.schedule(cronExpression, () => {
        logger?.info("Exécution du récap programmé");
        onTick();
      });
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
    validateCanSendRecap() {
      const config = configRepo.get();
      if (!config?.channel_id) {
        throw new ConfigError(
          "Channel not configured",
          "Aucun canal configuré. Utilise `/recap config` d'abord."
        );
      }
      return config;
    },
  };
}

module.exports = { createScheduleService };
