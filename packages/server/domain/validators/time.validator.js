/**
 * Time format validators - pure functions
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string|null} error - Error message if invalid
 * @property {string} [normalized] - Normalized value if valid
 */

/**
 * Validate and normalize time in HH:MM format
 * @param {string} time - Time string to validate
 * @returns {ValidationResult}
 */
export function validateTimeFormat(time) {
  if (!time || typeof time !== "string") {
    return {
      valid: false,
      error: "Time is required",
    };
  }

  const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
  const match = time.match(timeRegex);

  if (!match) {
    return {
      valid: false,
      error: "Invalid time format. Use HH:MM (e.g., 23:30)",
    };
  }

  // Normalize: add leading zero if needed
  const [, hours, minutes] = match;
  const normalized = `${hours.padStart(2, "0")}:${minutes}`;

  return {
    valid: true,
    error: null,
    normalized,
  };
}

/**
 * Convert HH:MM time to cron expression
 * @param {string} time - Time in HH:MM format (assumed valid)
 * @returns {string} Cron expression (e.g., "30 23 * * *")
 */
export function timeToCron(time) {
  const [hours, minutes] = time.split(":");
  return `${minutes} ${hours} * * *`;
}
