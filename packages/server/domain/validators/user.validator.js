/**
 * User validators - pure functions for user-related validation
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string|null} error - Error message if invalid
 */

/**
 * Validate user credentials (username and password presence)
 * @param {Object} credentials
 * @param {string} credentials.username
 * @param {string} credentials.password
 * @returns {ValidationResult}
 */
export function validateCredentials(credentials) {
  if (!credentials) {
    return {
      valid: false,
      error: "Username and password required",
    };
  }

  const { username, password } = credentials;

  if (!username || typeof username !== "string" || username.trim() === "") {
    return {
      valid: false,
      error: "Username and password required",
    };
  }

  if (!password || typeof password !== "string" || password.trim() === "") {
    return {
      valid: false,
      error: "Username and password required",
    };
  }

  return {
    valid: true,
    error: null,
  };
}

/**
 * Validate a password (min 6 chars)
 * @param {string} password
 * @returns {ValidationResult}
 */
export function validatePassword(password) {
  if (!password || typeof password !== "string" || password.trim() === "") {
    return { valid: false, error: "Le mot de passe est requis" };
  }

  if (password.length < 6) {
    return { valid: false, error: "Le mot de passe doit contenir au moins 6 caractères" };
  }

  return { valid: true, error: null };
}

/**
 * Validate an email address (basic format check)
 * @param {string} email
 * @returns {ValidationResult}
 */
export function validateEmail(email) {
  if (!email || typeof email !== "string" || email.trim() === "") {
    return { valid: false, error: "L'email est requis" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: "Format d'email invalide" };
  }

  return { valid: true, error: null };
}

/**
 * Validate a user ID
 * @param {number|string} userId
 * @returns {ValidationResult}
 */
export function validateUserId(userId) {
  const numId = Number(userId);

  if (!Number.isFinite(numId) || !Number.isInteger(numId) || numId <= 0) {
    return {
      valid: false,
      error: "Invalid user id",
    };
  }

  return {
    valid: true,
    error: null,
  };
}
