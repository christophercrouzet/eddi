const async = require('async');

const { replace, parseDate } = require('../utils');


// Process a single file.
function processFile(dateNames) {
  return (file, callback) => {
    const fieldNames =
      (file.meta.fields === undefined || file.meta.fields.dates === undefined)
        ? dateNames
        : [...dateNames, ...file.meta.fields.dates];

    let { meta } = file;
    fieldNames.forEach((fieldPath) => {
      meta = replace(meta, fieldPath, parseDate);
    });
    async.nextTick(callback, null, Object.assign({}, file, { meta }));
  };
}


// Parse the given date fields in a file's metadata.
module.exports = (dateNames) => {
  return (files, callback) => {
    async.map(
      files,
      processFile(dateNames),
      (error, results) => async.nextTick(callback, error, results)
    );
  };
};
