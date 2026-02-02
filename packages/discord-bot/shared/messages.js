/**
 * Styled message templates
 */

const { DISPLAY_MODE_LIST, SEPARATORS } = require("./constants");

/**
 * Message templates with emoji formatting
 */
const MESSAGES = {
  // ═══════════════════════════════════════════════════════════════
  // SUCCESS MESSAGES
  // ═══════════════════════════════════════════════════════════════

  CONFIG_SAVED: "✅ **Configuration sauvegardée !**\n{details}",
  RECAP_SENT: "📨 **Récap envoyé avec succès !**",
  LINKED: "🔗 **Compte lié !**\nTon compte Discord est maintenant connecté à `{username}`",
  UNLINKED: "🔓 **Compte délié !**\nTon compte Discord n'est plus associé à Tilt.",
  ENABLED: "✅ **Récaps automatiques activés !**",
  DISABLED: "⏸️ **Récaps automatiques désactivés.**",
  TIME_SET: "⏰ **Heure configurée !**\nLe récap sera envoyé à **{time}**",
  MODE_SET: "🎨 **Mode d'affichage configuré !**\nMode : `{mode}`",
  TITLE_SET: "📝 **Titre personnalisé !**\nTitre : {title}",
  TITLE_RESET: "📝 **Titre réinitialisé au défaut.**",
  COLOR_SET: "🎨 **Couleur personnalisée !**\nCouleur : `{color}`",
  COLOR_RESET: "🎨 **Couleur réinitialisée (automatique selon moyenne).**",
  FOOTER_SET: "📌 **Footer personnalisé !**\nFooter : {footer}",
  FOOTER_RESET: "📌 **Footer réinitialisé au défaut.**",
  DAYS_SET: "📅 **Jours configurés !**\nJours actifs : `{days}`",
  TIMEZONE_SET: "🌍 **Fuseau horaire configuré !**\nTimezone : `{timezone}`",
  REMINDER_ON: "🔔 **Rappel activé !**\nUn rappel sera envoyé **{minutes} minutes** avant le récap.",
  REMINDER_OFF: "🔕 **Rappel désactivé.**",
  REMINDER_TIME_SET: "⏱️ **Délai de rappel configuré !**\nRappel : **{minutes} minutes** avant le récap.",
  MENTION_SET: "📣 **Rôle de mention configuré !**\nRôle : {role}",
  MENTION_RESET: "📣 **Mention de rôle désactivée.**",
  MIN_PARTICIPANTS_SET: "👥 **Seuil de participants configuré !**\nMinimum : **{count}** participant(s)",
  CONFIG_RESET: "🔄 **Configuration réinitialisée !**\nTous les paramètres sont revenus aux valeurs par défaut.",

  // ═══════════════════════════════════════════════════════════════
  // INFO MESSAGES
  // ═══════════════════════════════════════════════════════════════

  STATUS_HEADER: "⚙️ **Configuration du Récap**",
  REMINDER: "⏰ **Rappel !**\nN'oubliez pas de noter votre journée ! Le récap arrive dans **{minutes} minutes**.",
  REMINDER_CUSTOM: "⏰ **Rappel !**\n{message}",
  PREVIEW_HEADER: "👁️ **Prévisualisation du récap**",
  NO_DATA_PREVIEW: "📭 **Aucune donnée à prévisualiser pour aujourd'hui.**",

  // ═══════════════════════════════════════════════════════════════
  // ERROR MESSAGES
  // ═══════════════════════════════════════════════════════════════

  NO_CHANNEL: "❌ **Aucun canal configuré**\nUtilise `/recap config` d'abord.",
  INVALID_MODE: `❌ **Mode invalide**\nModes disponibles : \`${DISPLAY_MODE_LIST.join("`, `")}\``,
  INVALID_COLOR: "❌ **Couleur invalide**\nUtilise un code hexadécimal (ex: `#FF5733` ou `FF5733`).",
  INVALID_TIME: "❌ **Format d'heure invalide**\nUtilise le format HH:MM (ex: `23:30`).",
  INVALID_DAYS: "❌ **Jours invalides**\nUtilise les abréviations : `lun`, `mar`, `mer`, `jeu`, `ven`, `sam`, `dim`\nExemple : `lun,mar,mer,jeu,ven`",
  INVALID_TIMEZONE: "❌ **Fuseau horaire invalide**\nExemple : `Europe/Paris`, `America/New_York`",
  INVALID_MINUTES: "❌ **Durée invalide**\nLa durée doit être entre 5 et 120 minutes.",
  INVALID_MIN_PARTICIPANTS: "❌ **Nombre invalide**\nLe minimum de participants doit être >= 0.",
  NO_PERMISSION: "🚫 **Permission refusée**\nCette commande est réservée aux administrateurs.",
  USER_NOT_FOUND: "❌ **Utilisateur non trouvé**\nL'utilisateur `{username}` n'existe pas sur Tilt.",
  API_ERROR: "❌ **Erreur de communication**\nImpossible de contacter le serveur. Réessaie plus tard.",
  NOT_ENOUGH_PARTICIPANTS: "⏭️ **Récap annulé**\nPas assez de participants ({count}/{min} requis).",

  // ═══════════════════════════════════════════════════════════════
  // RECAP STYLED MESSAGES
  // ═══════════════════════════════════════════════════════════════

  RECAP_TITLE: "📊 RÉCAP DU {date}",
  RECAP_TITLE_WEEKLY: "📊 RÉCAP DE LA SEMAINE ({start} - {end})",
  NO_PARTICIPANTS: "😴 **Aucune participation aujourd'hui...**\nRevenez demain !",
  PODIUM_HEADER: "🏆 **Podium**",
  STATS_HEADER: "📈 **Statistiques**",
  HIGHLIGHT_HEADER: "✨ **Moments forts**",
  BEST_COMMENT_HEADER: "💬 **Moment fort de {username}**",
  WORST_HEADER: "📉 **Moins bon moment**",
  PARTICIPANTS_HEADER: "👥 **Participants**",

  // ═══════════════════════════════════════════════════════════════
  // LEADERBOARD & STATS
  // ═══════════════════════════════════════════════════════════════

  LEADERBOARD_TITLE: "🏅 **Classement**",
  LEADERBOARD_MONTHLY: "📅 **Ce mois**",
  LEADERBOARD_ALLTIME: "🌟 **Tous temps**",
  USER_STATS_TITLE: "📊 **Stats de {username}**",
  NO_STATS: "📭 **Aucune statistique disponible.**",
  HISTORY_TITLE: "📜 **Historique des récaps**",
  NO_HISTORY: "📭 **Aucun historique disponible.**",
};

/**
 * Format a message template with variables
 * @param {string} template - Message template with {placeholders}
 * @param {Object} vars - Variables to replace
 * @returns {string} Formatted message
 */
function formatMessage(template, vars = {}) {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

/**
 * Create a progress bar
 * @param {number} value - Current value (0-max)
 * @param {number} max - Maximum value
 * @param {number} length - Bar length in characters
 * @returns {string} Progress bar string
 */
function createProgressBar(value, max, length = 10) {
  const filled = Math.round((value / max) * length);
  const empty = length - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

/**
 * Format a date in French
 * @param {string|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date
 */
function formatDateFR(date, options = {}) {
  const defaultOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return new Date(date).toLocaleDateString("fr-FR", { ...defaultOptions, ...options });
}

/**
 * Format a short date in French
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date (e.g., "15 jan")
 */
function formatShortDateFR(date) {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Get visual separator
 * @param {string} type - Separator type (thin, thick, dotted, wave)
 * @returns {string} Separator string
 */
function getSeparator(type = "thin") {
  return SEPARATORS[type] || SEPARATORS.thin;
}

/**
 * Build status display message
 * @param {Object} config - Bot configuration
 * @returns {string} Formatted status message
 */
function buildStatusMessage(config) {
  const channelMention = config.channel_id ? `<#${config.channel_id}>` : "Non configuré";
  const statusText = config.enabled ? "✅ Activé" : "⏸️ Désactivé";
  const reminderText = config.reminder_enabled
    ? `✅ ${config.reminder_minutes} min avant`
    : "❌ Désactivé";
  const mentionText = config.mention_role_id
    ? `<@&${config.mention_role_id}>`
    : "Aucun";

  const lines = [
    MESSAGES.STATUS_HEADER,
    getSeparator("thin"),
    "",
    `📺 **Canal :** ${channelMention}`,
    `⏰ **Heure :** ${config.recap_time || "23:30"}`,
    `📊 **Status :** ${statusText}`,
    `🎨 **Mode :** \`${config.display_mode || "top3"}\``,
    "",
    getSeparator("thin"),
    "",
    `📅 **Jours :** \`${config.days_of_week || "lun,mar,mer,jeu,ven,sam,dim"}\``,
    `🌍 **Timezone :** \`${config.timezone || "Europe/Paris"}\``,
    `🔔 **Rappel :** ${reminderText}`,
    `📣 **Mention :** ${mentionText}`,
    `👥 **Min. participants :** ${config.min_participants || 0}`,
  ];

  if (config.custom_title) {
    lines.push(`📝 **Titre :** ${config.custom_title}`);
  }
  if (config.custom_color) {
    lines.push(`🎨 **Couleur :** \`${config.custom_color}\``);
  }
  if (config.custom_footer) {
    lines.push(`📌 **Footer :** ${config.custom_footer}`);
  }

  return lines.join("\n");
}

module.exports = {
  MESSAGES,
  formatMessage,
  createProgressBar,
  formatDateFR,
  formatShortDateFR,
  getSeparator,
  buildStatusMessage,
};
