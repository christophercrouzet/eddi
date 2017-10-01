const path = require('path');

const async = require('async');
const pillr = require('pillr');

const { dirMetaName, extNames } = require('../common');


const DEFAULT_OPTIONS = {
  log: false,
};


// Filter the source asset files.
function filter(file) {
  const baseName = path.basename(file.path);
  return (
    baseName !== dirMetaName
    && !Object.values(extNames).includes(path.extname(file.path))
  );
}


module.exports = (sourcePath, destinationPath, options, callback) => {
  const opts = Object.assign({}, DEFAULT_OPTIONS, options);
  const queue = pillr.compounds.copy(destinationPath, opts);

  async.waterfall([
    cb => pillr.source(sourcePath, filter, pillr.ReadMode.STREAM, cb),
    (files, cb) => queue.apply(files, cb),
  ], (error, result) => {
    if (opts.log === true && !error) {
      console.log('Successfully completed task \'source_assets\'');
    }

    async.nextTick(callback, error, result);
  });
};
