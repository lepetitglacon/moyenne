/**
 * Entry validators - pure functions for entry/rating validation
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string|null} error - Error message if invalid
 */

/** Rating bounds */
export const RATING_MIN = 0;
export const RATING_MAX = 20;

/**
 * Validate a rating value
 * @param {number|string|null|undefined} rating - Rating to validate
 * @returns {ValidationResult}
 */
export function validateRating(rating) {
  if (rating === null || rating === undefined) {
    return {
      valid: false,
      error: "Rating is required",
    };
  }

  const numRating = Number(rating);

  if (!Number.isFinite(numRating)) {
    return {
      valid: false,
      error: "Rating must be a number",
    };
  }

  if (!Number.isInteger(numRating)) {
    return {
      valid: false,
      error: "Rating must be an integer",
    };
  }

  if (numRating < RATING_MIN || numRating > RATING_MAX) {
    return {
      valid: false,
      error: `Rating must be between ${RATING_MIN} and ${RATING_MAX}`,
    };
  }

  return {
    valid: true,
    error: null,
  };
}

/**
 * Validate an entry (rating + optional description)
 * @param {Object} entry
 * @param {number|string} entry.rating
 * @param {string} [entry.description]
 * @returns {ValidationResult}
 */
export function validateEntry(entry) {
  if (!entry) {
    return {
      valid: false,
      error: "Entry is required",
    };
  }

  const ratingResult = validateRating(entry.rating);
  if (!ratingResult.valid) {
    return ratingResult;
  }

  // Description is optional, no validation needed
  return {
    valid: true,
    error: null,
  };
}
