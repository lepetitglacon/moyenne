/**
 * Recap command definition
 */

const { SlashCommandBuilder, ChannelType } = require("discord.js");

const command = new SlashCommandBuilder()
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
  );

// Admin-only subcommands
const ADMIN_SUBCOMMANDS = ["config", "now", "enable", "disable", "time"];

module.exports = {
  command,
  ADMIN_SUBCOMMANDS,
};
