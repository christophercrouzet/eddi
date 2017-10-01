const path = require('path');

const async = require('async');
const pillr = require('pillr');

const { defaultThemePath } = require('../common');
const { dirExistsSync } = require('../utils');


const DEFAULT_OPTIONS = {
  themePath: defaultThemePath,
};


// Filter the theme asset files.
function filter(file) {
  const baseName = path.basename(file.path);
  return (
    !baseName.startsWith('.')
    && path.dirname(file.path).split(path.sep)[0] === 'assets'
  );
}


module.exports = (sourcePath, destinationPath, options, callback) => {
  const opts = Object.assign({}, DEFAULT_OPTIONS, options);
  if (!dirExistsSync(opts.themePath)) {
    throw new Error(`${opts.themePath}: No such theme directory`);
  }

  const queue = pillr.compounds.copy(destinationPath, opts);

  async.waterfall([
    cb => pillr.source(opts.themePath, filter, pillr.ReadMode.STREAM, cb),
    (files, cb) => queue.apply(files, cb),
  ], (error, result) => {
    if (opts.log === true && !error) {
      console.log('Successfully completed task \'theme_assets\'');
    }

    async.nextTick(callback, error, result);
  });
};
