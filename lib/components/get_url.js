const path = require('path');
const url = require('url');

const async = require('async');


// Process a single file.
function processFile() {
  return (file, callback) => {
    const shortURL = url.resolve('/', `${path.dirname(file.path)}`);
    const meta = Object.assign({}, file.meta, { url: shortURL });
    async.nextTick(callback, null, Object.assign({}, file, { meta }));
  };
}


// Retrieve the file URL.
module.exports = () => {
  return (files, callback) => {
    async.map(
      files,
      processFile(),
      (error, results) => async.nextTick(callback, error, results)
    );
  };
};
