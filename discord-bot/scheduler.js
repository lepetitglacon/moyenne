const cron = require("node-cron");
const { getConfig } = require("./db");
const { getDayRecap } = require("./api");
const { buildRecapEmbed } = require("./recap");
const { Logger } = require("./logger");

const log = new Logger("Scheduler");
let scheduledTask = null;

/**
 * Parse l'heure HH:MM en expression cron
 */
function timeToCron(time) {
  const [hours, minutes] = time.split(":");
  return `${minutes} ${hours} * * *`;
}

/**
 * Envoie le récap sur le canal configuré
 */
async function sendRecap(client) {
  const config = getConfig();

  if (!config || !config.enabled || !config.channel_id) {
    log.warning("Récap désactivé ou canal non configuré");
    return false;
  }

  try {
    const channel = await client.channels.fetch(config.channel_id);
    if (!channel) {
      log.error("Canal non trouvé", { channelId: config.channel_id });
      return false;
    }

    // Appelle l'API pour récupérer les données
    const data = await getDayRecap();
    const embed = buildRecapEmbed(data);

    await channel.send({ embeds: [embed] });
    log.info("Récap envoyé avec succès");
    return true;
  } catch (error) {
    log.error("Erreur envoi récap", { error: error.message });
    return false;
  }
}

/**
 * Démarre ou redémarre le scheduler avec la nouvelle heure
 */
function startScheduler(client) {
  // Stop existing task if any
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  const config = getConfig();

  if (!config || !config.enabled) {
    log.info("Non démarré (désactivé)");
    return;
  }

  const recapTime = config.recap_time || "23:30";
  const cronExpression = timeToCron(recapTime);

  log.info(`Programmé pour ${recapTime}`, { cron: cronExpression });

  scheduledTask = cron.schedule(cronExpression, () => {
    log.info(`Exécution du récap programmé`, { time: recapTime });
    sendRecap(client);
  });
}

/**
 * Arrête le scheduler
 */
function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    log.info("Arrêté");
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  sendRecap,
};
