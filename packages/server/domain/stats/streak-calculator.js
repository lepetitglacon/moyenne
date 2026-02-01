/**
 * Streak calculator - pure functions for streak calculations
 * No external dependencies
 */

/**
 * @typedef {Object} StreakResult
 * @property {number} currentStreak - Current consecutive days streak
 * @property {number} longestStreak - All-time longest streak record
 * @property {string|null} lastEntryDate - Date of the last entry
 */

/**
 * Parse a YYYY-MM-DD date string to a Date object (local timezone)
 * @param {string} dateStr
 * @returns {Date}
 */
function parseDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a date to YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get the previous day's date string
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {string}
 */
function getPreviousDay(dateStr) {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() - 1);
  return formatDate(date);
}

/**
 * Calculate streak statistics from a list of entries
 * @param {Array<{ date: string }>} entries - Entries sorted by date ASC
 * @param {string} [today] - Today's date (injectable for testing)
 * @returns {StreakResult}
 */
export function calculateStreak(entries, today = formatDate(new Date())) {
  if (!entries || entries.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastEntryDate: null };
  }

  // Build a Set of all entry dates for O(1) lookup
  const entryDates = new Set(entries.map((e) => e.date));

  // Get last entry date
  const lastEntryDate = entries[entries.length - 1].date;

  // Calculate longest streak (historical)
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate = null;

  for (const entry of entries) {
    if (prevDate === null) {
      tempStreak = 1;
    } else {
      const expectedPrev = getPreviousDay(entry.date);
      if (prevDate === expectedPrev) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }

    prevDate = entry.date;
  }

  // Calculate current streak
  // Start from today or yesterday and count backwards
  let currentStreak = 0;
  let checkDate = today;

  // If no entry today, start from yesterday
  if (!entryDates.has(checkDate)) {
    const yesterday = getPreviousDay(today);
    checkDate = yesterday;
  }

  // Count consecutive days backwards
  while (entryDates.has(checkDate)) {
    currentStreak++;
    checkDate = getPreviousDay(checkDate);
  }

  return {
    currentStreak,
    longestStreak,
    lastEntryDate,
  };
}
