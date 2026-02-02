/**
 * Embed Builder Service - Generates Discord embeds based on display mode
 */

const { EmbedBuilder } = require("discord.js");
const {
  DISPLAY_MODES,
  MEDALS,
  RATING_COLORS,
  SEPARATORS,
} = require("../shared/constants");
const {
  formatDateFR,
  formatShortDateFR,
  createProgressBar,
  getSeparator,
  MESSAGES,
} = require("../shared/messages");

/**
 * @param {{
 *   userService: import("./user.service").UserService,
 *   logger?: import("../logger").Logger
 * }} deps
 */
function createEmbedBuilderService({ userService, logger }) {
  /**
   * Get color based on rating
   */
  function getColorForRating(rating) {
    if (rating >= 16) return RATING_COLORS.excellent;
    if (rating >= 12) return RATING_COLORS.good;
    if (rating >= 8) return RATING_COLORS.average;
    if (rating >= 4) return RATING_COLORS.poor;
    return RATING_COLORS.bad;
  }

  /**
   * Get emoji based on rating
   */
  function getRatingEmoji(rating) {
    if (rating >= 16) return "🔥";
    if (rating >= 12) return "😊";
    if (rating >= 8) return "😐";
    if (rating >= 4) return "😕";
    return "😢";
  }

  /**
   * Get user mention or bold name
   */
  function getUserDisplay(username, linkMap) {
    const discordId = linkMap.get(username.toLowerCase());
    return discordId ? `<@${discordId}>` : `**${username}**`;
  }

  /**
   * Create base embed with common properties
   */
  function createBaseEmbed(data, config) {
    const dateFormatted = formatDateFR(data.date);
    const title = config.custom_title
      ? config.custom_title.replace("{date}", dateFormatted)
      : `📊 RÉCAP DU ${dateFormatted.toUpperCase()}`;

    const color = config.custom_color
      ? parseInt(config.custom_color.replace("#", ""), 16)
      : getColorForRating(data.avgRating);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setTimestamp();

    if (config.custom_footer) {
      embed.setFooter({ text: config.custom_footer });
    }

    return embed;
  }

  /**
   * Build stats fields
   */
  function buildStatsFields(data, showStats) {
    if (!showStats) return [];

    return [
      {
        name: "👥 Participants",
        value: `${data.participantCount}`,
        inline: true,
      },
      {
        name: "📊 Moyenne",
        value: `${data.avgRating.toFixed(1)}/20 ${getRatingEmoji(data.avgRating)}`,
        inline: true,
      },
      {
        name: "⭐ Notes données",
        value: `${data.ratingsGiven}`,
        inline: true,
      },
    ];
  }

  /**
   * Calculate statistics (median, std dev)
   */
  function calculateStats(entries) {
    if (!entries || entries.length === 0) {
      return { median: 0, stdDev: 0, min: 0, max: 0 };
    }

    const ratings = entries.map((e) => e.rating).sort((a, b) => a - b);
    const n = ratings.length;

    // Median
    const median =
      n % 2 === 0
        ? (ratings[n / 2 - 1] + ratings[n / 2]) / 2
        : ratings[Math.floor(n / 2)];

    // Mean
    const mean = ratings.reduce((a, b) => a + b, 0) / n;

    // Standard deviation
    const variance = ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return {
      median,
      stdDev,
      min: ratings[0],
      max: ratings[n - 1],
    };
  }

  /**
   * Find best comment from entries
   */
  function findBestComment(entries) {
    if (!entries) return null;
    return entries.find((e) => e.description && e.description.trim().length > 0);
  }

  /**
   * Truncate text
   */
  function truncate(text, maxLength = 200) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  // ═══════════════════════════════════════════════════════════════
  // MODE BUILDERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * MINIMAL: One line with average + participants
   */
  function buildMinimalEmbed(data, config) {
    const embed = createBaseEmbed(data, config);

    if (data.participantCount === 0) {
      embed.setDescription("😴 Aucune participation aujourd'hui...");
      return embed;
    }

    const emoji = getRatingEmoji(data.avgRating);
    embed.setDescription(
      `${emoji} **Moyenne : ${data.avgRating.toFixed(1)}/20** · ${data.participantCount} participant(s)`
    );

    if (!config.custom_footer) {
      embed.setFooter({ text: "À demain !" });
    }

    return embed;
  }

  /**
   * TOP3: Podium + best comment + stats (default)
   */
  async function buildTopNEmbed(data, config, n = 3) {
    const embed = createBaseEmbed(data, config);
    const linkMap = await userService.getAllLinksMap();

    if (data.participantCount === 0) {
      embed.setDescription("😴 **Aucune participation aujourd'hui...**\nRevenez demain !");
      return embed;
    }

    // Stats
    if (config.show_stats !== 0) {
      embed.addFields(buildStatsFields(data, true));
    }

    // Top N
    if (data.top3 && data.top3.length > 0) {
      const topN = data.top3.slice(0, n);
      const topText = topN
        .map((entry, i) => {
          const medal = MEDALS[i] || `${i + 1}.`;
          const display = getUserDisplay(entry.username, linkMap);
          return `${medal} ${display} - **${entry.rating}/20**`;
        })
        .join("\n");

      embed.addFields({
        name: "🏆 Podium",
        value: topText,
        inline: false,
      });
    }

    // Best comment
    if (config.show_comments !== 0) {
      const bestWithComment = findBestComment(data.top3);
      if (bestWithComment) {
        embed.addFields({
          name: `💬 Moment fort de ${bestWithComment.username}`,
          value: `"${truncate(bestWithComment.description)}"`,
          inline: false,
        });
      }
    }

    if (!config.custom_footer) {
      embed.setFooter({ text: "À demain !" });
    }

    return embed;
  }

  /**
   * FULL: All participants with notes and comments
   */
  async function buildFullEmbed(data, config) {
    const embed = createBaseEmbed(data, config);
    const linkMap = await userService.getAllLinksMap();

    if (data.participantCount === 0) {
      embed.setDescription("😴 **Aucune participation aujourd'hui...**\nRevenez demain !");
      return embed;
    }

    // Stats
    if (config.show_stats !== 0) {
      embed.addFields(buildStatsFields(data, true));
    }

    // All participants
    if (data.entries && data.entries.length > 0) {
      // Sort by rating descending
      const sorted = [...data.entries].sort((a, b) => b.rating - a.rating);

      const chunks = [];
      let currentChunk = [];
      let currentLength = 0;

      for (let i = 0; i < sorted.length; i++) {
        const entry = sorted[i];
        const medal = i < 5 ? MEDALS[i] : "▫️";
        const display = getUserDisplay(entry.username, linkMap);
        let line = `${medal} ${display} - **${entry.rating}/20**`;

        if (config.show_comments !== 0 && entry.description) {
          line += `\n   _"${truncate(entry.description, 100)}"_`;
        }

        if (currentLength + line.length > 900) {
          chunks.push(currentChunk.join("\n"));
          currentChunk = [];
          currentLength = 0;
        }

        currentChunk.push(line);
        currentLength += line.length;
      }

      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join("\n"));
      }

      chunks.forEach((chunk, i) => {
        embed.addFields({
          name: i === 0 ? "👥 Participants" : "​", // Zero-width space for continuation
          value: chunk,
          inline: false,
        });
      });
    }

    if (!config.custom_footer) {
      embed.setFooter({ text: "À demain !" });
    }

    return embed;
  }

  /**
   * ANONYMOUS: Like top3/5 but without names
   */
  function buildAnonymousEmbed(data, config) {
    const embed = createBaseEmbed(data, config);

    if (data.participantCount === 0) {
      embed.setDescription("😴 **Aucune participation aujourd'hui...**\nRevenez demain !");
      return embed;
    }

    // Stats
    if (config.show_stats !== 0) {
      embed.addFields(buildStatsFields(data, true));
    }

    // Top entries without names
    if (data.top3 && data.top3.length > 0) {
      const topText = data.top3
        .slice(0, 5)
        .map((entry, i) => {
          const medal = MEDALS[i];
          return `${medal} **${entry.rating}/20** ${getRatingEmoji(entry.rating)}`;
        })
        .join("\n");

      embed.addFields({
        name: "📊 Top Notes",
        value: topText,
        inline: false,
      });
    }

    // Best comment (anonymous)
    if (config.show_comments !== 0) {
      const bestWithComment = findBestComment(data.top3);
      if (bestWithComment) {
        embed.addFields({
          name: "💬 Moment fort",
          value: `"${truncate(bestWithComment.description)}"`,
          inline: false,
        });
      }
    }

    if (!config.custom_footer) {
      embed.setFooter({ text: "À demain !" });
    }

    return embed;
  }

  /**
   * STATS: Focus on statistics
   */
  function buildStatsEmbed(data, config) {
    const embed = createBaseEmbed(data, config);

    if (data.participantCount === 0) {
      embed.setDescription("😴 **Aucune participation aujourd'hui...**\nRevenez demain !");
      return embed;
    }

    const stats = calculateStats(data.entries || data.top3 || []);

    // Main stats
    embed.addFields(
      {
        name: "👥 Participants",
        value: `${data.participantCount}`,
        inline: true,
      },
      {
        name: "📊 Moyenne",
        value: `${data.avgRating.toFixed(1)}/20`,
        inline: true,
      },
      {
        name: "📈 Médiane",
        value: `${stats.median.toFixed(1)}/20`,
        inline: true,
      }
    );

    // Extended stats
    embed.addFields(
      {
        name: "📉 Écart-type",
        value: `${stats.stdDev.toFixed(2)}`,
        inline: true,
      },
      {
        name: "⬆️ Max",
        value: `${stats.max}/20`,
        inline: true,
      },
      {
        name: "⬇️ Min",
        value: `${stats.min}/20`,
        inline: true,
      }
    );

    // Visual bar
    const avgBar = createProgressBar(data.avgRating, 20, 15);
    embed.addFields({
      name: "📊 Distribution",
      value: `\`${avgBar}\` ${data.avgRating.toFixed(1)}/20`,
      inline: false,
    });

    if (!config.custom_footer) {
      embed.setFooter({ text: "À demain !" });
    }

    return embed;
  }

  /**
   * HIGHLIGHTS: Extremes only
   */
  async function buildHighlightsEmbed(data, config) {
    const embed = createBaseEmbed(data, config);
    const linkMap = await userService.getAllLinksMap();

    if (data.participantCount === 0) {
      embed.setDescription("😴 **Aucune participation aujourd'hui...**\nRevenez demain !");
      return embed;
    }

    // Quick stats
    embed.setDescription(
      `${getRatingEmoji(data.avgRating)} **Moyenne : ${data.avgRating.toFixed(1)}/20** · ${data.participantCount} participant(s)`
    );

    // Best
    if (data.top3 && data.top3.length > 0) {
      const best = data.top3[0];
      const bestDisplay = getUserDisplay(best.username, linkMap);
      embed.addFields({
        name: "🔥 Meilleure note",
        value: `${bestDisplay} - **${best.rating}/20**`,
        inline: true,
      });
    }

    // Worst (if we have entries)
    if (data.entries && data.entries.length > 0) {
      const sorted = [...data.entries].sort((a, b) => a.rating - b.rating);
      const worst = sorted[0];
      const worstDisplay = getUserDisplay(worst.username, linkMap);
      embed.addFields({
        name: "📉 Note la plus basse",
        value: `${worstDisplay} - **${worst.rating}/20**`,
        inline: true,
      });
    }

    // Best comment
    if (config.show_comments !== 0) {
      const bestWithComment = findBestComment(data.top3);
      if (bestWithComment) {
        embed.addFields({
          name: `💬 Moment fort de ${bestWithComment.username}`,
          value: `"${truncate(bestWithComment.description)}"`,
          inline: false,
        });
      }
    }

    if (!config.custom_footer) {
      embed.setFooter({ text: "À demain !" });
    }

    return embed;
  }

  /**
   * COMPACT: Inline list
   */
  async function buildCompactEmbed(data, config) {
    const embed = createBaseEmbed(data, config);
    const linkMap = await userService.getAllLinksMap();

    if (data.participantCount === 0) {
      embed.setDescription("😴 Aucune participation aujourd'hui...");
      return embed;
    }

    // Stats line
    let description = `${getRatingEmoji(data.avgRating)} **Moy: ${data.avgRating.toFixed(1)}** · ${data.participantCount} participants\n\n`;

    // Compact list
    if (data.top3 && data.top3.length > 0) {
      const entries = data.entries || data.top3;
      const sorted = [...entries].sort((a, b) => b.rating - a.rating);

      const compactList = sorted
        .slice(0, 10)
        .map((entry, i) => {
          const medal = i < 3 ? MEDALS[i] : "";
          const name = entry.username;
          return `${medal}${name} ${entry.rating}`;
        })
        .join(" · ");

      description += compactList;
    }

    embed.setDescription(description);

    if (!config.custom_footer) {
      embed.setFooter({ text: "À demain !" });
    }

    return embed;
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════

  const builders = {
    [DISPLAY_MODES.MINIMAL]: buildMinimalEmbed,
    [DISPLAY_MODES.TOP3]: async (data, config) => buildTopNEmbed(data, config, 3),
    [DISPLAY_MODES.TOP5]: async (data, config) => buildTopNEmbed(data, config, 5),
    [DISPLAY_MODES.FULL]: buildFullEmbed,
    [DISPLAY_MODES.ANONYMOUS]: buildAnonymousEmbed,
    [DISPLAY_MODES.STATS]: buildStatsEmbed,
    [DISPLAY_MODES.HIGHLIGHTS]: buildHighlightsEmbed,
    [DISPLAY_MODES.COMPACT]: buildCompactEmbed,
  };

  return {
    /**
     * Build embed based on config mode
     * @param {Object} data - Recap data from API
     * @param {Object} config - Bot configuration
     * @returns {Promise<EmbedBuilder>}
     */
    async build(data, config) {
      const mode = config.display_mode || DISPLAY_MODES.TOP3;
      const builder = builders[mode] || builders[DISPLAY_MODES.TOP3];
      return builder(data, config);
    },

    /**
     * Build embed for a specific mode (for preview)
     * @param {Object} data - Recap data
     * @param {Object} config - Bot configuration
     * @param {string} mode - Display mode
     * @returns {Promise<EmbedBuilder>}
     */
    async buildWithMode(data, config, mode) {
      const builder = builders[mode] || builders[DISPLAY_MODES.TOP3];
      return builder(data, config);
    },

    /**
     * Build weekly recap embed
     * @param {Object} data - Weekly recap data
     * @param {Object} config - Bot configuration
     * @returns {Promise<EmbedBuilder>}
     */
    async buildWeekly(data, config) {
      const startDate = formatShortDateFR(data.startDate);
      const endDate = formatShortDateFR(data.endDate);

      const color = config.custom_color
        ? parseInt(config.custom_color.replace("#", ""), 16)
        : getColorForRating(data.avgRating || 10);

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`📊 RÉCAP DE LA SEMAINE (${startDate} - ${endDate})`)
        .setTimestamp();

      if (data.participantCount === 0) {
        embed.setDescription("😴 **Aucune participation cette semaine...**");
        return embed;
      }

      const linkMap = await userService.getAllLinksMap();

      // Stats
      embed.addFields(
        {
          name: "👥 Participants",
          value: `${data.participantCount}`,
          inline: true,
        },
        {
          name: "📊 Moyenne",
          value: `${(data.avgRating || 0).toFixed(1)}/20 ${getRatingEmoji(data.avgRating || 0)}`,
          inline: true,
        },
        {
          name: "📅 Jours actifs",
          value: `${data.activeDays || 0}`,
          inline: true,
        }
      );

      // Weekly leaderboard
      if (data.leaderboard && data.leaderboard.length > 0) {
        const leaderText = data.leaderboard
          .slice(0, 5)
          .map((entry, i) => {
            const medal = MEDALS[i];
            const display = getUserDisplay(entry.username, linkMap);
            return `${medal} ${display} - **${entry.avgRating.toFixed(1)}/20** (${entry.entries} jours)`;
          })
          .join("\n");

        embed.addFields({
          name: "🏆 Top de la semaine",
          value: leaderText,
          inline: false,
        });
      }

      if (config.custom_footer) {
        embed.setFooter({ text: config.custom_footer });
      } else {
        embed.setFooter({ text: "À la semaine prochaine !" });
      }

      return embed;
    },

    /**
     * Build leaderboard embed
     * @param {Object} data - Leaderboard data
     * @param {Object} config - Bot configuration
     * @returns {Promise<EmbedBuilder>}
     */
    async buildLeaderboard(data, config) {
      const linkMap = await userService.getAllLinksMap();

      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle("🏅 Classement")
        .setTimestamp();

      // Monthly leaderboard
      if (data.monthly && data.monthly.length > 0) {
        const monthlyText = data.monthly
          .slice(0, 5)
          .map((entry, i) => {
            const medal = MEDALS[i];
            const display = getUserDisplay(entry.username, linkMap);
            return `${medal} ${display} - **${entry.avgRating.toFixed(1)}/20**`;
          })
          .join("\n");

        embed.addFields({
          name: "📅 Ce mois",
          value: monthlyText,
          inline: true,
        });
      }

      // All-time leaderboard
      if (data.allTime && data.allTime.length > 0) {
        const allTimeText = data.allTime
          .slice(0, 5)
          .map((entry, i) => {
            const medal = MEDALS[i];
            const display = getUserDisplay(entry.username, linkMap);
            return `${medal} ${display} - **${entry.avgRating.toFixed(1)}/20**`;
          })
          .join("\n");

        embed.addFields({
          name: "🌟 Tous temps",
          value: allTimeText,
          inline: true,
        });
      }

      // Top participants
      if (data.topParticipants && data.topParticipants.length > 0) {
        const participantsText = data.topParticipants
          .slice(0, 5)
          .map((entry, i) => {
            const medal = MEDALS[i];
            const display = getUserDisplay(entry.username, linkMap);
            return `${medal} ${display} - **${entry.count}** jours`;
          })
          .join("\n");

        embed.addFields({
          name: "🎯 Plus assidus",
          value: participantsText,
          inline: false,
        });
      }

      return embed;
    },

    /**
     * Build user stats embed
     * @param {Object} data - User stats data
     * @param {string} username - Username
     * @param {Object} config - Bot configuration
     * @returns {EmbedBuilder}
     */
    buildUserStats(data, username, config) {
      const embed = new EmbedBuilder()
        .setColor(0x3b82f6)
        .setTitle(`📊 Stats de ${username}`)
        .setTimestamp();

      if (!data || data.participationCount === 0) {
        embed.setDescription("📭 Aucune statistique disponible.");
        return embed;
      }

      embed.addFields(
        {
          name: "📅 Participations",
          value: `${data.participationCount}`,
          inline: true,
        },
        {
          name: "📊 Moyenne mensuelle",
          value: data.currentMonthAvg ? `${data.currentMonthAvg.toFixed(1)}/20` : "N/A",
          inline: true,
        },
        {
          name: "🔥 Streak actuel",
          value: `${data.streak?.currentStreak || 0} jours`,
          inline: true,
        }
      );

      if (data.lastEntry) {
        embed.addFields({
          name: "📝 Dernière entrée",
          value: `**${data.lastEntry.rating}/20** le ${formatShortDateFR(data.lastEntry.date)}`,
          inline: false,
        });
      }

      if (data.streak?.longestStreak > 0) {
        embed.addFields({
          name: "🏆 Record streak",
          value: `${data.streak.longestStreak} jours`,
          inline: true,
        });
      }

      return embed;
    },

    /**
     * Build history embed
     * @param {Array} history - History data
     * @param {Object} config - Bot configuration
     * @returns {EmbedBuilder}
     */
    buildHistory(history, config) {
      const embed = new EmbedBuilder()
        .setColor(0x6b7280)
        .setTitle("📜 Historique des récaps")
        .setTimestamp();

      if (!history || history.length === 0) {
        embed.setDescription("📭 Aucun historique disponible.");
        return embed;
      }

      const historyText = history
        .map((entry) => {
          const date = formatShortDateFR(entry.date);
          const emoji = getRatingEmoji(entry.avgRating);
          return `**${date}** - ${emoji} ${entry.avgRating.toFixed(1)}/20 (${entry.participantCount} participants)`;
        })
        .join("\n");

      embed.setDescription(historyText);

      return embed;
    },
  };
}

module.exports = { createEmbedBuilderService };
