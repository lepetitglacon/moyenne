/**
 * Discord Bot Bootstrap
 * - Load config
 * - Initialize DB
 * - Initialize repositories
 * - Initialize services
 * - Initialize handlers
 * - Register commands
 * - Start bot
 */

require("dotenv").config();

const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const config = require("./config");
const { db, initDb } = require("./db");
const { Logger, logger } = require("./logger");
const apiClient = require("./api");

// Infrastructure
const {
  createConfigRepository,
  createUserLinkRepository,
} = require("./infrastructure");

// Application
const {
  createScheduleService,
  createUserService,
  createRecapService,
} = require("./application");

// Commands & Handlers
const { commands } = require("./commands");
const { createRecapHandler, createInteractionHandler } = require("./handlers");

async function main() {
  // Validate environment variables
  if (!config.discord.token || !config.discord.clientId) {
    logger.error("DISCORD_TOKEN ou DISCORD_CLIENT_ID non défini");
    logger.error("Crée un fichier .env avec ces variables");
    process.exit(1);
  }

  // Initialize database
  initDb();

  // Initialize repositories
  const configRepo = createConfigRepository(db);
  const userLinkRepo = createUserLinkRepository(db);

  // Initialize loggers
  const logSchedule = new Logger("Schedule");
  const logUser = new Logger("User");
  const logRecap = new Logger("Recap");
  const logHandler = new Logger("Handler");

  // Initialize services
  const scheduleService = createScheduleService({
    configRepo,
    logger: logSchedule,
  });

  const userService = createUserService({
    userLinkRepo,
    apiClient,
    logger: logUser,
  });

  const recapService = createRecapService({
    scheduleService,
    userService,
    apiClient,
    logger: logRecap,
  });

  // Initialize handlers
  const recapHandler = createRecapHandler({
    scheduleService,
    userService,
    recapService,
    logger: logHandler,
  });

  const interactionHandler = createInteractionHandler({
    recapHandler,
    logger: logHandler,
  });

  // Create Discord client
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  // Register slash commands
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

  // Event: Bot ready
  client.once("clientReady", () => {
    logger.info(`Connecté en tant que ${client.user.tag}`);

    // Start scheduler
    scheduleService.start(() => recapService.send(client));
  });

  // Event: Interaction (slash commands)
  client.on("interactionCreate", async (interaction) => {
    try {
      await interactionHandler.handle(interaction, client);
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

  // Connect
  await client.login(config.discord.token);
}

main().catch((err) => {
  logger.error("Erreur fatale", { error: err.message });
  process.exit(1);
});
