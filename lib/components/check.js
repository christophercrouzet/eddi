const path = require('path');

const async = require('async');


// Check the metadata of a file.
function check(file) {
  const { meta } = file;

  if (meta.baseURL === undefined) {
    return 'No base URL specified';
  } else if (meta.layout === undefined) {
    return 'No layout specified';
  }

  const ext = path.extname(meta.layout);
  if (ext === '.html') {
    if (meta.title === undefined) {
      return 'No title specified';
    } else if (meta.description === undefined) {
      return 'No description specified';
    } else if (meta.keywords === undefined) {
      return 'No keywords specified';
    }

    if (meta.entry === true) {
      if (meta.uid === undefined) {
        return 'No unique id specified';
      } else if (meta.dateCreated === undefined) {
        return 'No creation date specified';
      }
    }
  }

  return null;
}


// Process a single file.
function processFile() {
  return (file, callback) => {
    const result = check(file);
    if (result) {
      async.nextTick(callback, new Error(`${file.path}: ${result}`), file);
      return;
    }

    async.nextTick(callback, null, file);
  };
}


// Check the metadata.
module.exports = () => {
  return (files, callback) => {
    async.map(
      files,
      processFile(),
      (error, results) => async.nextTick(callback, error, results)
    );
  };
};
