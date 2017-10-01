const path = require('path');

const async = require('async');
const pillr = require('pillr');

const {
  defaultThemePath,
  dirMetaName,
  extNames,
  containerNames,
} = require('../common');
const { expandAssets } = require('../components');
const { makePage } = require('../compounds');
const { dirExistsSync } = require('../utils');


const DEFAULT_OPTIONS = {
  dirMetaName,
  containerNames,
  themePath: defaultThemePath,
};


// Process the page files.
function processPages(
  sourcePath,
  destinationPath,
  templatesPath,
  options,
  callback
) {
  // Filter page files.
  const filter = (file) => {
    return path.extname(file.path) === extNames.page;
  };

  const queue = makePage(sourcePath, destinationPath, templatesPath, options);

  async.waterfall([
    cb => pillr.source(sourcePath, filter, pillr.ReadMode.UTF8, cb),
    (files, cb) => queue.apply(files, cb),
  ], (error, result) => {
    async.nextTick(callback, error, result);
  });
}


// Write any asset described within a file's metadata.
function sinkAssets(files, destinationPath, options, callback) {
  async.waterfall([
    async.constant(files),
    expandAssets(),
    pillr.components.sink(destinationPath, false, options.log)
  ], (error) => {
    async.nextTick(callback, error, files);
  });
}


module.exports = (sourcePath, destinationPath, options, callback) => {
  const opts = Object.assign({}, DEFAULT_OPTIONS, options);
  if (!dirExistsSync(opts.themePath)) {
    throw new Error(`${opts.themePath}: No such theme directory`);
  }

  const templatesPath = path.join(opts.themePath, 'templates');

  async.waterfall([
    cb => processPages(sourcePath, destinationPath, templatesPath, opts, cb),
    (files, cb) => sinkAssets(files, destinationPath, opts, cb),
  ], (error, result) => {
    if (opts.log === true && !error) {
      console.log('Successfully completed task \'pages\'');
    }

    async.nextTick(callback, error, result);
  });
};
