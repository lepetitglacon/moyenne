/**
 * Configuration module with environment validation
 * Crashes at boot with clear message if required variables are missing
 */

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[CONFIG ERROR] Missing required environment variable: ${name}`);
    console.error(`Please set ${name} in your .env file or environment`);
    process.exit(1);
  }
  return value;
}

function optionalEnv(name, defaultValue) {
  return process.env[name] || defaultValue;
}

// Validate and export configuration
const config = {
  port: parseInt(optionalEnv("PORT", "3000"), 10),

  // Required - no fallback for security
  secretKey: requireEnv("SECRET_KEY"),
  botApiKey: requireEnv("BOT_API_KEY"),

  // Optional with safe defaults
  frontendUrl: optionalEnv("FRONTEND_URL", "http://localhost:5173"),
  logLevel: optionalEnv("LOG_LEVEL", "INFO"),
};

export default config;
