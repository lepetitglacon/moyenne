module.exports = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
  },
  api: {
    baseUrl: process.env.API_BASE_URL || "http://localhost:3000/api",
    key: process.env.API_KEY,
  },
};
