/**
 * Commands registry
 */

const { command: recapCommand, ADMIN_SUBCOMMANDS } = require("./recap.command");

const commands = [recapCommand];

module.exports = {
  commands,
  ADMIN_SUBCOMMANDS,
};
