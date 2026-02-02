/**
 * Bot constants
 */

/**
 * Display modes for recap embeds
 */
const DISPLAY_MODES = {
  MINIMAL: "minimal",
  TOP3: "top3",
  TOP5: "top5",
  FULL: "full",
  ANONYMOUS: "anonymous",
  STATS: "stats",
  HIGHLIGHTS: "highlights",
  COMPACT: "compact",
};

const DISPLAY_MODE_LIST = Object.values(DISPLAY_MODES);

const DISPLAY_MODE_DESCRIPTIONS = {
  minimal: "Une ligne : moyenne + participants",
  top3: "Podium + meilleur commentaire + stats (défaut)",
  top5: "Top 5 + meilleur commentaire + stats",
  full: "Tous les participants avec notes et commentaires",
  anonymous: "Comme top3/5 mais sans noms (juste notes)",
  stats: "Focus statistiques : moyenne, médiane, écart-type, tendances",
  highlights: "Extrêmes uniquement : meilleure note, pire note, meilleur commentaire",
  compact: "Liste inline (🥇 Alice 9 · 🥈 Bob 8 · ...)",
};

/**
 * Days of week mapping (FR abbreviations)
 */
const DAYS_OF_WEEK = {
  lun: { index: 1, full: "lundi" },
  mar: { index: 2, full: "mardi" },
  mer: { index: 3, full: "mercredi" },
  jeu: { index: 4, full: "jeudi" },
  ven: { index: 5, full: "vendredi" },
  sam: { index: 6, full: "samedi" },
  dim: { index: 0, full: "dimanche" },
};

const ALL_DAYS = "lun,mar,mer,jeu,ven,sam,dim";
const WEEKDAYS = "lun,mar,mer,jeu,ven";
const WEEKEND = "sam,dim";

/**
 * Medal emojis for podium
 */
const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

/**
 * Rating emojis based on score
 */
const RATING_EMOJIS = {
  excellent: "🔥", // >= 16
  good: "😊", // >= 12
  average: "😐", // >= 8
  poor: "😕", // >= 4
  bad: "😢", // < 4
};

/**
 * Colors for embeds based on average rating
 */
const RATING_COLORS = {
  excellent: 0x22c55e, // Green >= 16
  good: 0x84cc16, // Light green >= 12
  average: 0xeab308, // Yellow >= 8
  poor: 0xf97316, // Orange >= 4
  bad: 0xef4444, // Red < 4
};

/**
 * Default colors for embeds
 */
const DEFAULT_COLORS = {
  success: 0x22c55e,
  error: 0xef4444,
  warning: 0xf97316,
  info: 0x3b82f6,
  neutral: 0x6b7280,
};

/**
 * Visual separators
 */
const SEPARATORS = {
  thin: "─".repeat(20),
  thick: "━".repeat(20),
  dotted: "·".repeat(20),
  wave: "〰".repeat(10),
};

/**
 * Progress bar characters
 */
const PROGRESS_BAR = {
  filled: "█",
  empty: "░",
  half: "▓",
};

/**
 * Default timezone
 */
const DEFAULT_TIMEZONE = "Europe/Paris";

/**
 * Reminder defaults
 */
const REMINDER_DEFAULTS = {
  minutes: 30,
  minMinutes: 5,
  maxMinutes: 120,
};

module.exports = {
  DISPLAY_MODES,
  DISPLAY_MODE_LIST,
  DISPLAY_MODE_DESCRIPTIONS,
  DAYS_OF_WEEK,
  ALL_DAYS,
  WEEKDAYS,
  WEEKEND,
  MEDALS,
  RATING_EMOJIS,
  RATING_COLORS,
  DEFAULT_COLORS,
  SEPARATORS,
  PROGRESS_BAR,
  DEFAULT_TIMEZONE,
  REMINDER_DEFAULTS,
};
