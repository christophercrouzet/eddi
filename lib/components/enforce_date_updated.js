const async = require('async');


// Process a single file.
function processFile(dateNames) {
  return (file, callback) => {
    if (file.meta[dateNames.updated] !== undefined) {
      async.nextTick(callback, null, file);
      return;
    }

    const meta = Object.assign({}, file.meta, {
      [dateNames.updated]: file.meta[dateNames.created],
    });
    async.nextTick(callback, null, Object.assign({}, file, { meta }));
  };
}


// Set the updated date if none is set already.
module.exports = (dateNames) => {
  return (files, callback) => {
    async.map(
      files,
      processFile(dateNames),
      (error, results) => async.nextTick(callback, error, results)
    );
  };
};
