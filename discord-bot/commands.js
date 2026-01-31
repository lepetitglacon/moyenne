const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const { getConfig, updateConfig, linkUser, getUserLink, unlinkUser } = require("./db");
const { startScheduler, sendRecap } = require("./scheduler");
const { checkUser } = require("./api");

/**
 * Définition des commandes slash
 */
const commands = [
  new SlashCommandBuilder()
    .setName("recap")
    .setDescription("Commandes du bot de récap journalier")
    .addSubcommand((sub) =>
      sub
        .setName("config")
        .setDescription("Configure le canal de publication du récap")
        .addChannelOption((option) =>
          option
            .setName("canal")
            .setDescription("Le canal où publier le récap")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("now").setDescription("Force l'envoi du récap maintenant")
    )
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("Affiche la configuration actuelle")
    )
    .addSubcommand((sub) =>
      sub.setName("enable").setDescription("Active les récaps automatiques")
    )
    .addSubcommand((sub) =>
      sub.setName("disable").setDescription("Désactive les récaps automatiques")
    )
    .addSubcommand((sub) =>
      sub
        .setName("time")
        .setDescription("Configure l'heure d'envoi du récap")
        .addStringOption((option) =>
          option
            .setName("heure")
            .setDescription("Heure au format HH:MM (ex: 23:30)")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("link")
        .setDescription("Lie ton compte Discord à ton compte Tilt")
        .addStringOption((option) =>
          option
            .setName("username")
            .setDescription("Ton nom d'utilisateur Tilt")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("unlink").setDescription("Délie ton compte Discord de Tilt")
    ),
];

/**
 * Gère les interactions des commandes
 */
async function handleCommand(interaction, client) {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "recap") return;

  const subcommand = interaction.options.getSubcommand();

  // Commandes admin only (sauf link/unlink)
  const adminCommands = ["config", "now", "enable", "disable", "time"];
  if (adminCommands.includes(subcommand)) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: "Cette commande est réservée aux administrateurs.",
        ephemeral: true,
      });
      return;
    }
  }

  switch (subcommand) {
    case "config":
      await handleConfig(interaction);
      break;
    case "now":
      await handleNow(interaction, client);
      break;
    case "status":
      await handleStatus(interaction);
      break;
    case "enable":
      await handleToggle(interaction, client, true);
      break;
    case "disable":
      await handleToggle(interaction, client, false);
      break;
    case "time":
      await handleTime(interaction, client);
      break;
    case "link":
      await handleLink(interaction);
      break;
    case "unlink":
      await handleUnlink(interaction);
      break;
  }
}

async function handleConfig(interaction) {
  const channel = interaction.options.getChannel("canal");

  updateConfig({
    channel_id: channel.id,
    guild_id: interaction.guildId,
  });

  await interaction.reply({
    content: `Le récap sera publié dans ${channel}`,
    ephemeral: true,
  });
}

async function handleNow(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const config = getConfig();

  if (!config || !config.channel_id) {
    await interaction.editReply({
      content: "Aucun canal configuré. Utilise `/recap config` d'abord.",
    });
    return;
  }

  const success = await sendRecap(client);

  if (success) {
    await interaction.editReply({ content: "Récap envoyé !" });
  } else {
    await interaction.editReply({
      content: "Erreur lors de l'envoi du récap. Vérifie les logs.",
    });
  }
}

async function handleStatus(interaction) {
  const config = getConfig();

  if (!config) {
    await interaction.reply({
      content: "Aucune configuration trouvée.",
      ephemeral: true,
    });
    return;
  }

  const channelMention = config.channel_id
    ? `<#${config.channel_id}>`
    : "Non configuré";
  const status = config.enabled ? "Activé" : "Désactivé";

  await interaction.reply({
    content: [
      "**Configuration du récap**",
      `Canal: ${channelMention}`,
      `Heure: ${config.recap_time || "23:30"}`,
      `Status: ${status}`,
    ].join("\n"),
    ephemeral: true,
  });
}

async function handleToggle(interaction, client, enabled) {
  updateConfig({ enabled: enabled ? 1 : 0 });

  // Redémarre le scheduler
  startScheduler(client);

  await interaction.reply({
    content: enabled
      ? "Récaps automatiques activés"
      : "Récaps automatiques désactivés",
    ephemeral: true,
  });
}

async function handleTime(interaction, client) {
  const time = interaction.options.getString("heure");

  // Validation du format HH:MM
  const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
  if (!timeRegex.test(time)) {
    await interaction.reply({
      content: "Format invalide. Utilise le format HH:MM (ex: 23:30)",
      ephemeral: true,
    });
    return;
  }

  // Normalise l'heure (ajoute le 0 devant si nécessaire)
  const [hours, minutes] = time.split(":");
  const normalizedTime = `${hours.padStart(2, "0")}:${minutes}`;

  updateConfig({ recap_time: normalizedTime });

  // Redémarre le scheduler avec la nouvelle heure
  startScheduler(client);

  await interaction.reply({
    content: `Heure du récap configurée à ${normalizedTime}`,
    ephemeral: true,
  });
}

async function handleLink(interaction) {
  const username = interaction.options.getString("username");
  const discordId = interaction.user.id;

  await interaction.deferReply({ ephemeral: true });

  // Vérifie que l'utilisateur Tilt existe via l'API
  const exists = await checkUser(username);

  if (!exists) {
    await interaction.editReply({
      content: `Aucun compte Tilt trouvé avec le nom "${username}"`,
    });
    return;
  }

  // Lie le compte
  linkUser(discordId, username);

  await interaction.editReply({
    content: `Ton compte Discord est maintenant lié au compte Tilt "${username}" ! Tu seras mentionné dans les récaps.`,
  });
}

async function handleUnlink(interaction) {
  const discordId = interaction.user.id;
  const existing = getUserLink(discordId);

  if (!existing) {
    await interaction.reply({
      content: "Ton compte Discord n'est lié à aucun compte Tilt.",
      ephemeral: true,
    });
    return;
  }

  unlinkUser(discordId);

  await interaction.reply({
    content: "Ton compte Discord a été délié de Tilt.",
    ephemeral: true,
  });
}

module.exports = {
  commands,
  handleCommand,
};
