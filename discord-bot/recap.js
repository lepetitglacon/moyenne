const { EmbedBuilder } = require("discord.js");
const { getAllUserLinks } = require("./db");

/**
 * Génère l'embed Discord pour le récap
 */
function buildRecapEmbed(data) {
  const dateFormatted = new Date(data.date).toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const embed = new EmbedBuilder()
    .setColor(getColorForRating(data.avgRating))
    .setTitle(`RECAP DU JOUR - ${dateFormatted}`)
    .setTimestamp();

  // Pas de participants
  if (data.participantCount === 0) {
    embed.setDescription("Aucune participation aujourd'hui... Revenez demain !");
    return embed;
  }

  // Récupère les liens Discord pour mentionner les users
  const userLinks = getAllUserLinks();
  const linkMap = new Map(userLinks.map((l) => [l.tilt_username.toLowerCase(), l.discord_id]));

  // Stats générales
  embed.addFields(
    {
      name: "Participants",
      value: `${data.participantCount}`,
      inline: true,
    },
    {
      name: "Moyenne du jour",
      value: `${data.avgRating}/20 ${getRatingEmoji(data.avgRating)}`,
      inline: true,
    },
    {
      name: "Ratings donnés",
      value: `${data.ratingsGiven}`,
      inline: true,
    }
  );

  // Top 3
  if (data.top3 && data.top3.length > 0) {
    const medals = ["🥇", "🥈", "🥉"];
    const top3Text = data.top3
      .map((entry, i) => {
        const discordId = linkMap.get(entry.username.toLowerCase());
        const mention = discordId ? `<@${discordId}>` : `**${entry.username}**`;
        return `${medals[i]} ${mention} - ${entry.rating}/20`;
      })
      .join("\n");

    embed.addFields({
      name: "Podium",
      value: top3Text,
      inline: false,
    });
  }

  // Meilleur commentaire (le premier du top 3 avec description)
  const bestWithComment = data.top3?.find(
    (e) => e.description && e.description.trim().length > 0
  );
  if (bestWithComment) {
    const truncatedDesc =
      bestWithComment.description.length > 200
        ? bestWithComment.description.substring(0, 200) + "..."
        : bestWithComment.description;
    embed.addFields({
      name: `Moment fort de ${bestWithComment.username}`,
      value: `"${truncatedDesc}"`,
      inline: false,
    });
  }

  embed.setFooter({ text: "A demain !" });

  return embed;
}

/**
 * Retourne une couleur en fonction de la note moyenne
 */
function getColorForRating(rating) {
  if (rating >= 16) return 0x22c55e; // Vert
  if (rating >= 12) return 0x84cc16; // Vert clair
  if (rating >= 8) return 0xeab308; // Jaune
  if (rating >= 4) return 0xf97316; // Orange
  return 0xef4444; // Rouge
}

/**
 * Retourne un emoji en fonction de la note
 */
function getRatingEmoji(rating) {
  if (rating >= 16) return "🔥";
  if (rating >= 12) return "😊";
  if (rating >= 8) return "😐";
  if (rating >= 4) return "😕";
  return "😢";
}

module.exports = {
  buildRecapEmbed,
};
