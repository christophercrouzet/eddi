const path = require('path');

const async = require('async');


// Process a single file.
function processFile(value) {
  return (file, callback) => {
    const filePath = path.join(value, file.path);
    async.nextTick(callback, null, Object.assign({}, file, { path: filePath }));
  };
}


// Prepend to the file path.
module.exports = (value) => {
  return (files, callback) => {
    async.map(
      files,
      processFile(value),
      (error, results) => async.nextTick(callback, error, results)
    );
  };
};
