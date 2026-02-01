/**
 * Discord reply helpers
 */
const { BotError } = require("./errors");

/**
 * Send an ephemeral error reply
 * @param {import("discord.js").ChatInputCommandInteraction} interaction
 * @param {string} message
 */
async function replyError(interaction, message) {
  const payload = { content: message, ephemeral: true };

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(payload);
  } else {
    await interaction.reply(payload);
  }
}

/**
 * Send an ephemeral success reply
 * @param {import("discord.js").ChatInputCommandInteraction} interaction
 * @param {string} message
 */
async function replySuccess(interaction, message) {
  const payload = { content: message, ephemeral: true };

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(payload);
  } else {
    await interaction.reply(payload);
  }
}

/**
 * Handle errors and send appropriate Discord reply
 * @param {import("discord.js").ChatInputCommandInteraction} interaction
 * @param {Error} error
 * @param {import("../logger").Logger} logger
 */
async function handleError(interaction, error, logger) {
  if (error instanceof BotError) {
    await replyError(interaction, error.userMessage);
  } else {
    logger?.error("Erreur inattendue", { error: error.message });
    await replyError(interaction, "Une erreur est survenue.");
  }
}

module.exports = {
  replyError,
  replySuccess,
  handleError,
};
