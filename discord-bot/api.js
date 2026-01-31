const config = require("./config");
const { Logger } = require("./logger");

const log = new Logger("API");

/**
 * Appelle l'API Tilt
 */
async function callApi(endpoint, options = {}) {
  const url = `${config.api.baseUrl}${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
    ...(config.api.key && { "X-API-Key": config.api.key }),
    ...options.headers,
  };

  try {
    log.debug(`Appel ${endpoint}`, { url });

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API Error ${response.status}: ${text}`);
    }

    return await response.json();
  } catch (error) {
    log.error(`Erreur appel ${endpoint}`, { error: error.message });
    throw error;
  }
}

/**
 * Récupère le récap du jour
 */
async function getDayRecap(date = null) {
  const dateParam = date || new Date().toISOString().split("T")[0];
  return callApi(`/recap?date=${dateParam}`);
}

/**
 * Récupère la liste des utilisateurs
 */
async function getUsers() {
  return callApi("/bot/users");
}

/**
 * Vérifie si un utilisateur existe
 */
async function checkUser(username) {
  try {
    const data = await callApi(`/bot/user/${encodeURIComponent(username)}`);
    return data.exists;
  } catch {
    return false;
  }
}

module.exports = {
  callApi,
  getDayRecap,
  getUsers,
  checkUser,
};
