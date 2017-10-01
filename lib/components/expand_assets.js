const path = require('path');

const async = require('async');


// Process a single file.
function processFile() {
  return (out, file, callback) => {
    if (file.meta.assets === undefined) {
      async.nextTick(callback, null, out);
      return;
    }

    file.meta.assets
      .forEach((asset) => {
        out.push({
          path: path.join(file.meta.filePath.dir, asset.path),
          data: asset.data,
        });
      });

    async.nextTick(callback, null, out);
  };
}


// Expand any asset stored in the metadata.
module.exports = () => {
  return (files, callback) => {
    async.reduce(
      files,
      [],
      processFile(),
      (error, result) => async.nextTick(callback, error, result)
    );
  };
};
