const async = require('async');


// Process a single file.
function processFile() {
  return (file, callback) => {
    const siteURL = '/';
    const meta = Object.assign({}, file.meta, { siteURL });
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
