/**
 * Application-level errors
 * Used by services to signal specific error conditions
 * Handlers translate these to appropriate HTTP responses
 */

/**
 * Base application error
 */
export class AppError extends Error {
  constructor(message, code = "APP_ERROR") {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

/**
 * Validation error - invalid input data
 * Maps to HTTP 400
 */
export class ValidationError extends AppError {
  constructor(message) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

/**
 * Authentication error - invalid credentials
 * Maps to HTTP 401
 */
export class AuthError extends AppError {
  constructor(message = "Invalid credentials") {
    super(message, "AUTH_ERROR");
    this.name = "AuthError";
  }
}

/**
 * Not found error - resource doesn't exist
 * Maps to HTTP 404
 */
export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

/**
 * Forbidden error - action not allowed
 * Maps to HTTP 403
 */
export class ForbiddenError extends AppError {
  constructor(message = "Action not allowed") {
    super(message, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

/**
 * Conflict error - resource already exists
 * Maps to HTTP 400 (or 409)
 */
export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, "CONFLICT");
    this.name = "ConflictError";
  }
}
