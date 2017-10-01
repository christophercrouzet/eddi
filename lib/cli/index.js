#!/usr/bin/env node

const process = require('process');

const helpCmd = require('./commands/help');
const { getCommand } = require('./utils');


function printHelp() {
  console.log(helpCmd.usage);
}


module.exports = () => {
  const argv = process.argv.slice(2);
  const commandName = argv.shift();
  if (commandName === undefined) {
    printHelp();
    return 0;
  }

  const command = getCommand(commandName);
  if (command === null) {
    printHelp();
    return 0;
  }

  return command.run(argv);
};
