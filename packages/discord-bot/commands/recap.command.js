/**
 * Recap command definition
 */

const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { DISPLAY_MODE_LIST, DISPLAY_MODE_DESCRIPTIONS } = require("../shared/constants");

const command = new SlashCommandBuilder()
  .setName("recap")
  .setDescription("Commandes du bot de récap journalier")
  // ═══════════════════════════════════════════════════════════════
  // CONFIGURATION COMMANDS
  // ═══════════════════════════════════════════════════════════════
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
      .setName("mode")
      .setDescription("Configure le mode d'affichage du récap")
      .addStringOption((option) =>
        option
          .setName("mode")
          .setDescription("Mode d'affichage")
          .setRequired(true)
          .addChoices(
            ...DISPLAY_MODE_LIST.map((mode) => ({
              name: `${mode} - ${DISPLAY_MODE_DESCRIPTIONS[mode]}`,
              value: mode,
            }))
          )
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("title")
      .setDescription("Définit un titre personnalisé pour le récap")
      .addStringOption((option) =>
        option
          .setName("titre")
          .setDescription("Titre personnalisé (vide pour reset). Utilise {date} pour la date")
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("color")
      .setDescription("Définit une couleur personnalisée pour l'embed")
      .addStringOption((option) =>
        option
          .setName("couleur")
          .setDescription("Code hex (ex: #FF5733 ou FF5733). Vide pour couleur auto")
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("footer")
      .setDescription("Définit un footer personnalisé pour l'embed")
      .addStringOption((option) =>
        option
          .setName("texte")
          .setDescription("Texte du footer (vide pour reset)")
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("days")
      .setDescription("Configure les jours d'envoi du récap")
      .addStringOption((option) =>
        option
          .setName("jours")
          .setDescription("Jours (ex: lun,mar,mer,jeu,ven)")
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("timezone")
      .setDescription("Configure le fuseau horaire")
      .addStringOption((option) =>
        option
          .setName("tz")
          .setDescription("Fuseau horaire (ex: Europe/Paris)")
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("reminder")
      .setDescription("Configure le rappel avant le récap")
      .addStringOption((option) =>
        option
          .setName("etat")
          .setDescription("Activer ou désactiver")
          .setRequired(false)
          .addChoices(
            { name: "Activer", value: "on" },
            { name: "Désactiver", value: "off" }
          )
      )
      .addIntegerOption((option) =>
        option
          .setName("minutes")
          .setDescription("Minutes avant le récap (5-120)")
          .setRequired(false)
          .setMinValue(5)
          .setMaxValue(120)
      )
      .addStringOption((option) =>
        option
          .setName("message")
          .setDescription("Message personnalisé (vide pour reset)")
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("mention")
      .setDescription("Configure le rôle à mentionner dans le récap")
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("Rôle à mentionner (vide pour désactiver)")
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("min-participants")
      .setDescription("Définit le minimum de participants pour envoyer le récap")
      .addIntegerOption((option) =>
        option
          .setName("nombre")
          .setDescription("Nombre minimum de participants")
          .setRequired(true)
          .setMinValue(0)
      )
  )
  .addSubcommand((sub) =>
    sub.setName("reset").setDescription("Réinitialise la configuration aux valeurs par défaut")
  )
  // ═══════════════════════════════════════════════════════════════
  // RECAP COMMANDS
  // ═══════════════════════════════════════════════════════════════
  .addSubcommand((sub) =>
    sub.setName("now").setDescription("Force l'envoi du récap maintenant")
  )
  .addSubcommand((sub) =>
    sub.setName("preview").setDescription("Prévisualise le récap actuel sans l'envoyer")
  )
  .addSubcommand((sub) =>
    sub.setName("weekly").setDescription("Affiche le récap de la semaine")
  )
  .addSubcommand((sub) =>
    sub
      .setName("stats")
      .setDescription("Affiche les stats d'un utilisateur")
      .addStringOption((option) =>
        option
          .setName("username")
          .setDescription("Nom d'utilisateur Tilt (vide pour toi)")
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub.setName("leaderboard").setDescription("Affiche le classement")
  )
  .addSubcommand((sub) =>
    sub
      .setName("history")
      .setDescription("Affiche l'historique des récaps")
      .addIntegerOption((option) =>
        option
          .setName("nombre")
          .setDescription("Nombre de récaps à afficher (défaut: 5)")
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(30)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("daily")
      .setDescription("Affiche le classement du jour")
      .addStringOption((option) =>
        option
          .setName("date")
          .setDescription("Date au format YYYY-MM-DD (défaut: aujourd'hui)")
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub.setName("detectives").setDescription("Affiche le classement des détectives")
  )
  // ═══════════════════════════════════════════════════════════════
  // USER COMMANDS
  // ═══════════════════════════════════════════════════════════════
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
const ADMIN_SUBCOMMANDS = [
  "config",
  "now",
  "enable",
  "disable",
  "time",
  "mode",
  "title",
  "color",
  "footer",
  "days",
  "timezone",
  "reminder",
  "mention",
  "min-participants",
  "reset",
];

module.exports = {
  command,
  ADMIN_SUBCOMMANDS,
};
