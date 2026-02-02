/**
 * Interaction dispatcher
 */

/**
 * @param {{
 *   recapHandler: ReturnType<import("./recap.handler").createRecapHandler>,
 *   logger: import("../logger").Logger
 * }} deps
 */
function createInteractionHandler({ recapHandler, logger }) {
  return {
    /**
     * Handle all incoming interactions
     */
    async handle(interaction, client) {
      if (!interaction.isChatInputCommand()) return;

      const subcommand = interaction.options.getSubcommand(false);
      logger?.info("Commande reçue", {
        command: interaction.commandName,
        subcommand,
        user: interaction.user.tag,
        guild: interaction.guild?.name,
      });

      switch (interaction.commandName) {
        case "recap":
          await recapHandler.handle(interaction, client);
          break;
        default:
          logger?.warning("Commande inconnue", { command: interaction.commandName });
      }
    },
  };
}

module.exports = { createInteractionHandler };
