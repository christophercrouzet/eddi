const version = require('../../version');


const USAGE = `Print the version number.

usage: eddi version`;


module.exports = {
  usage: USAGE,
  run: (argv) => {
    console.log(version);
    return 0;
  },
};
