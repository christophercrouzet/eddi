const async = require('async');
const pillr = require('pillr');

const pagesTask = require('./pages');
const sourceAssetsTask = require('./source_assets');
const stylesTask = require('./styles');
const themeAssetsTask = require('./theme_assets');


const DEFAULT_OPTIONS = {
  log: false,
};
const FORCE_OPTIONS = {
  sink: false,
};


function runTasks(sourcePath, destinationPath, options, callback) {
  async.parallel([
    cb => pagesTask(sourcePath, destinationPath, options, cb),
    cb => sourceAssetsTask(sourcePath, destinationPath, options, cb),
    cb => stylesTask(sourcePath, destinationPath, options, cb),
    cb => themeAssetsTask(sourcePath, destinationPath, options, cb),
  ], (error, results) => {
    if (error) {
      async.nextTick(callback, error);
      return;
    }

    const files = results.reduce((arr, result) => arr.concat(result), []);
    async.nextTick(callback, null, files);
  });
}


module.exports = (sourcePath, destinationPath, options, callback) => {
  const opts = Object.assign({}, DEFAULT_OPTIONS, options, FORCE_OPTIONS);
  async.waterfall([
    cb => runTasks(sourcePath, destinationPath, opts, cb),
    pillr.components.sink(destinationPath, opts.sink, opts.log),
  ], (error, result) => {
    if (opts.log === true && !error) {
      console.log('Successfully completed task \'all\'');
    }

    async.nextTick(callback, error, result);
  });
};
