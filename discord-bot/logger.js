const LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
};

const COLORS = {
  DEBUG: "\x1b[36m",   // Cyan
  INFO: "\x1b[32m",    // Green
  WARNING: "\x1b[33m", // Yellow
  ERROR: "\x1b[31m",   // Red
  RESET: "\x1b[0m",
};

class Logger {
  constructor(name = "App") {
    this.name = name;
    this.level = LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LEVELS.INFO;
  }

  _format(level, message, meta = null) {
    const timestamp = new Date().toISOString();
    const color = COLORS[level];
    const reset = COLORS.RESET;

    let output = `${color}[${timestamp}] [${level}] [${this.name}]${reset} ${message}`;

    if (meta) {
      output += ` ${JSON.stringify(meta)}`;
    }

    return output;
  }

  _log(level, message, meta) {
    if (LEVELS[level] >= this.level) {
      const formatted = this._format(level, message, meta);

      if (level === "ERROR") {
        console.error(formatted);
      } else if (level === "WARNING") {
        console.warn(formatted);
      } else {
        console.log(formatted);
      }
    }
  }

  debug(message, meta) {
    this._log("DEBUG", message, meta);
  }

  info(message, meta) {
    this._log("INFO", message, meta);
  }

  warning(message, meta) {
    this._log("WARNING", message, meta);
  }

  warn(message, meta) {
    this.warning(message, meta);
  }

  error(message, meta) {
    this._log("ERROR", message, meta);
  }

  child(name) {
    return new Logger(`${this.name}:${name}`);
  }
}

// Export une instance par défaut et la classe
const logger = new Logger("Bot");

module.exports = { Logger, logger };
