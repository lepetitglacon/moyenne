/**
 * Infrastructure layer - Repositories
 */

const { createConfigRepository } = require("./config.repository");
const { createUserLinkRepository } = require("./user-link.repository");

module.exports = {
  createConfigRepository,
  createUserLinkRepository,
};
