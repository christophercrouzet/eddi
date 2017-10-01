const async = require('async');

const { replace, parseURI } = require('../utils');


// Process a single file.
function processFile(files, urlNames) {
  return (file, callback) => {
    const fieldNames =
      (file.meta.fields === undefined || file.meta.fields.urls === undefined)
        ? urlNames
        : [...urlNames, ...file.meta.fields.urls];

    let { meta } = file;
    fieldNames.forEach((fieldPath) => {
      meta = replace(meta, fieldPath, uri => parseURI(uri, file.meta, files));
    });
    async.nextTick(callback, null, Object.assign({}, file, { meta }));
  };
}


// Parse the given URLs in a file's metadata.
module.exports = (urlNames) => {
  return (files, callback) => {
    async.map(
      files,
      processFile(files, urlNames),
      (error, results) => async.nextTick(callback, error, results)
    );
  };
};
