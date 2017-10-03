const path = require('path');
const url = require('url');

const async = require('async');


// Process a single file.
function processFile(rootPath, local, baseURLOverride) {
  return (file, callback) => {
    let baseURL;
    if (baseURLOverride !== undefined) {
      baseURL = baseURLOverride;
    } else if (local === true) {
      baseURL = new url.URL(path.resolve(rootPath), 'file://').href;
    }

    if (baseURL === undefined) {
      async.nextTick(callback, null, file);
      return;
    }

    const meta = Object.assign({}, file.meta, { baseURL });
    async.nextTick(callback, null, Object.assign({}, file, { meta }));
  };
}


// Update the base URL if required.
module.exports = (rootPath, local, baseURLOverride) => {
  return (files, callback) => {
    async.map(
      files,
      processFile(rootPath, local, baseURLOverride),
      (error, results) => async.nextTick(callback, error, results)
    );
  };
};
