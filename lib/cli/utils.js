const path = require('path');


const COMMANDS_PATH = path.join(__dirname, 'commands');


// Copy an object but keep only its properties that are not undefined.
function filterDefinedProperties(obj) {
  return Object.entries(obj)
    .filter(([k, v]) => v !== undefined)
    .reduce((o, [k, v]) => Object.assign(o, { [k]: v }), {});
}


// Retrieve a command by its name.
function getCommand(name) {
  const modulePath = path.join(COMMANDS_PATH, name);
  try {
    // The method `require.resolve()` does not load the module in memory so
    // this only catches exceptions thrown if the module doesn't exist.
    require.resolve(modulePath);
  } catch (error) {
    switch (error.code) {
      case 'MODULE_NOT_FOUND':
        return null;
      default:
        throw error;
    }
  }

  return require(modulePath);
}


module.exports = {
  filterDefinedProperties,
  getCommand,
};
