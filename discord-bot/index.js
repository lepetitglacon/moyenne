require("dotenv").config();

const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const config = require("./config");
const { initDb } = require("./db");
const { commands, handleCommand } = require("./commands");
const { startScheduler } = require("./scheduler");
const { logger } = require("./logger");

async function main() {
  // Vérifie les variables d'environnement
  if (!config.discord.token || !config.discord.clientId) {
    logger.error("DISCORD_TOKEN ou DISCORD_CLIENT_ID non défini");
    logger.error("Crée un fichier .env avec ces variables");
    process.exit(1);
  }

  // Initialise la base de données locale
  initDb();

  // Crée le client Discord
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  // Enregistre les commandes slash
  const rest = new REST({ version: "10" }).setToken(config.discord.token);

  try {
    logger.info("Enregistrement des commandes slash...");
    await rest.put(Routes.applicationCommands(config.discord.clientId), {
      body: commands.map((cmd) => cmd.toJSON()),
    });
    logger.info("Commandes enregistrées avec succès");
  } catch (error) {
    logger.error("Erreur enregistrement commandes", { error: error.message });
    process.exit(1);
  }

  // Event: Bot prêt
  client.once("clientReady", () => {
    logger.info(`Connecté en tant que ${client.user.tag}`);

    // Démarre le scheduler
    startScheduler(client);
  });

  // Event: Interaction (commandes slash)
  client.on("interactionCreate", async (interaction) => {
    try {
      await handleCommand(interaction, client);
    } catch (error) {
      logger.error("Erreur commande", { error: error.message });

      const reply = {
        content: "Une erreur est survenue lors de l'exécution de la commande.",
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  });

  // Connexion
  await client.login(config.discord.token);
}

main().catch((err) => {
  logger.error("Erreur fatale", { error: err.message });
  process.exit(1);
});
