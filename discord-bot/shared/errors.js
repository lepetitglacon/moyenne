/**
 * Bot error types
 */

class BotError extends Error {
  constructor(message, userMessage = null) {
    super(message);
    this.name = this.constructor.name;
    this.userMessage = userMessage || message;
  }
}

class ValidationError extends BotError {
  constructor(message) {
    super(message, message);
  }
}

class ConfigError extends BotError {
  constructor(message, userMessage = "Configuration manquante.") {
    super(message, userMessage);
  }
}

class ApiError extends BotError {
  constructor(message, userMessage = "Erreur de communication avec le serveur.") {
    super(message, userMessage);
  }
}

class NotFoundError extends BotError {
  constructor(message, userMessage = "Ressource non trouvée.") {
    super(message, userMessage);
  }
}

module.exports = {
  BotError,
  ValidationError,
  ConfigError,
  ApiError,
  NotFoundError,
};
