const path = require('path');
const url = require('url');

const async = require('async');


// Process a single file.
function processFile(rootPath, local) {
  return (file, callback) => {
    if (!local) {
      async.nextTick(callback, null, file);
      return;
    }

    const baseURL = new url.URL(path.resolve(rootPath), 'file://').href;
    const meta = Object.assign({}, file.meta, { baseURL });
    async.nextTick(callback, null, Object.assign({}, file, { meta }));
  };
}


// Update the base URL if the site is built for local use.
module.exports = (rootPath, local) => {
  return (files, callback) => {
    async.map(
      files,
      processFile(rootPath, local),
      (error, results) => async.nextTick(callback, error, results)
    );
  };
};
