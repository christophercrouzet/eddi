const path = require('path');

const async = require('async');
const pillr = require('pillr');

const { defaultThemePath } = require('../common');
const { makeStyle } = require('../compounds');
const { dirExistsSync } = require('../utils');


const DEFAULT_OPTIONS = {
  themePath: defaultThemePath,
  preprocessor: pillr.StylePreprocessor.LESS,
};


// Filter style files.
function filter(file) {
  return file.path === 'main.less';
}


module.exports = (sourcePath, destinationPath, options, callback) => {
  const opts = Object.assign({}, DEFAULT_OPTIONS, options);
  if (!dirExistsSync(opts.themePath)) {
    throw new Error(`${opts.themePath}: No such theme directory`);
  }

  const stylesPath = path.join(opts.themePath, 'styles');
  const queue = makeStyle(destinationPath, stylesPath, opts);

  async.waterfall([
    cb => pillr.source(stylesPath, filter, pillr.ReadMode.UTF8, cb),
    (files, cb) => queue.apply(files, cb),
  ], (error, result) => {
    if (opts.log === true && !error) {
      console.log('Successfully completed task \'styles\'');
    }

    async.nextTick(callback, error, result);
  });
};
