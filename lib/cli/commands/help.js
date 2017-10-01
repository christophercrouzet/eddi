const minimist = require('minimist');

const { getCommand } = require('../utils');


const USAGE = `Make static sites great again.

usage: eddi <command> [options]

Commands:
  build    Build the site into a given directory
  help     Show this screen
  version  Print the version number`;


module.exports = {
  usage: USAGE,
  run: (argv) => {
    const args = minimist(argv);

    const [commandName] = args._;

    if (commandName === undefined) {
      console.log(USAGE);
      return 0;
    }

    const command = getCommand(commandName);
    if (command === null) {
      console.log(USAGE);
      return 0;
    }

    console.log(command.usage);
    return 0;
  },
};
