/**
 * Stats calculator - pure functions for statistics calculations
 * No external dependencies
 */

/**
 * @typedef {Object} Entry
 * @property {number} rating - Rating value (0-20)
 * @property {string} [username] - Username (optional)
 * @property {string} [description] - Description (optional)
 */

/**
 * @typedef {Object} TopEntry
 * @property {string} username
 * @property {number} rating
 * @property {string|null} description
 * @property {string[]} tags
 */

/**
 * @typedef {Object} RecapStats
 * @property {number} participantCount - Number of entries
 * @property {number} avgRating - Average rating (rounded to 1 decimal)
 * @property {TopEntry[]} top3 - Top 3 entries by rating
 */

/**
 * Calculate average rating from entries
 * @param {Entry[]} entries - Array of entries with rating property
 * @returns {number} Average rounded to 1 decimal, or 0 if no entries
 */
export function calculateAverage(entries) {
  if (!entries || entries.length === 0) {
    return 0;
  }

  const sum = entries.reduce((acc, entry) => acc + (entry.rating || 0), 0);
  const avg = sum / entries.length;

  return Math.round(avg * 10) / 10;
}

/**
 * Get top N entries sorted by rating descending
 * @param {Entry[]} entries - Array of entries (should already be sorted by rating DESC)
 * @param {number} [n=3] - Number of top entries to return
 * @returns {TopEntry[]}
 */
export function getTopN(entries, n = 3) {
  if (!entries || entries.length === 0) {
    return [];
  }

  return entries.slice(0, n).map((e) => ({
    username: e.username,
    rating: e.rating,
    description: e.description || null,
    tags: e.tags || [],
  }));
}

/**
 * Calculate recap statistics from entries
 * @param {Entry[]} entries - Array of entries sorted by rating DESC
 * @param {number} ratingsCount - Number of ratings given
 * @returns {RecapStats & { ratingsGiven: number }}
 */
export function calculateRecapStats(entries, ratingsCount = 0) {
  const participantCount = entries?.length || 0;
  const avgRating = calculateAverage(entries);
  const top3 = getTopN(entries, 3);

  return {
    participantCount,
    avgRating,
    top3,
    ratingsGiven: ratingsCount,
  };
}

/**
 * Calculate average from a single value (for DB AVG results)
 * @param {number|null|undefined} avgValue - Raw average from DB
 * @returns {number|null} Rounded average or null
 */
export function normalizeDbAverage(avgValue) {
  if (avgValue === null || avgValue === undefined) {
    return null;
  }
  return Math.round(avgValue * 10) / 10;
}
