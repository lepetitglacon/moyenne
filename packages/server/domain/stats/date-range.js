/**
 * Date range helpers - pure functions for date calculations
 * No external dependencies
 */

/**
 * @typedef {Object} MonthRange
 * @property {string} monthStart - First day of month (YYYY-MM-DD)
 * @property {string} monthEnd - Last day of month (YYYY-MM-DD)
 */

/**
 * Format a date to YYYY-MM-DD in local timezone
 * @param {Date} date
 * @returns {string}
 */
function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a month parameter and return the start/end dates
 * @param {string|null|undefined} monthParam - Month in YYYY-MM format, or null for current month
 * @param {Date} [now] - Reference date (defaults to current date, injectable for testing)
 * @returns {MonthRange}
 */
export function getMonthRange(monthParam, now = new Date()) {
  let year, month;

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    year = Number(monthParam.slice(0, 4));
    month = Number(monthParam.slice(5, 7));
  } else {
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;

  // Last day of current month = day 0 of next month
  const lastDay = new Date(year, month, 0);
  const monthEnd = formatDateLocal(lastDay);

  return { monthStart, monthEnd };
}

/**
 * Get today's date in YYYY-MM-DD format
 * @param {Date} [now] - Reference date (defaults to current date, injectable for testing)
 * @returns {string}
 */
export function getToday(now = new Date()) {
  return formatDateLocal(now);
}

/**
 * Get yesterday's date in YYYY-MM-DD format
 * @param {Date} [now] - Reference date (defaults to current date, injectable for testing)
 * @returns {string}
 */
export function getYesterday(now = new Date()) {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDateLocal(yesterday);
}

/**
 * Check if a date string is valid YYYY-MM-DD format
 * @param {string} dateStr
 * @returns {boolean}
 */
export function isValidDateFormat(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

/**
 * Check if a month string is valid YYYY-MM format
 * @param {string} monthStr
 * @returns {boolean}
 */
export function isValidMonthFormat(monthStr) {
  if (!monthStr || typeof monthStr !== "string") return false;
  return /^\d{4}-\d{2}$/.test(monthStr);
}
