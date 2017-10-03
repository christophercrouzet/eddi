const minimist = require('minimist');

const { filterDefinedProperties } = require('../utils');
const build = require('../../build');


const USAGE = `Build the site into a given directory.

usage: eddi build [--debug] [--local] [--log] [--task=<name>]
                  [--theme-path=<path>] [--] <source-path> <destination-path>

Options:

  --debug
    Turn on the debugging mode.

  --local
    Mark the intention of opening the site from within a local file system, thus
    using the 'file://' protocol to override the 'baseURL' metadata with the
    destination path.

  --log
    Output a log.

  --task=<name>
    Task to run.

  --theme-path=<path>
    Path to the theme to use.

  --
    This can be used to visually separate the options from the source path.`;


module.exports = {
  usage: USAGE,
  run: (argv) => {
    const args = minimist(argv, {
      boolean: ['debug', 'local', 'log'],
      string: ['task', 'theme-path'],
    });

    const [sourcePath, destinationPath] = args._;
    const options = filterDefinedProperties({
      local: args['local'],
      log: args['log'],
      themePath: args['theme-path'],
    });

    if (args['debug'] === true) {
      options.minify = false;
    }

    return build(sourcePath, destinationPath, options, args['task']);
  },
};
