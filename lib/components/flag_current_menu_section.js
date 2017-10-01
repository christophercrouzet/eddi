const async = require('async');


// Retrieve the section URL.
function getSectionURL(files, currentFile) {
  // Filter for candidates.
  const filter = (file) => {
    return (
      file.meta.section === currentFile.meta.section
      && currentFile.path.startsWith(file.meta.filePath.dir)
    );
  };

  const candidates = files.filter(file => filter(file));
  if (candidates.length === 0) {
    return undefined;
  }

  // The first candidate found should be the section root.
  return candidates[0].meta.url;
}


// Process a single file.
function processFile(files) {
  // Flag a menu item referring to the current section.
  const flagCurrent = (menuItem, sectionURL) => {
    if (sectionURL === undefined) {
      return menuItem;
    }

    const current = menuItem.url.full === sectionURL.full;
    if (!current) {
      return menuItem;
    }

    return Object.assign({}, menuItem, { current });
  };

  return (file, callback) => {
    if (file.meta.menu === undefined) {
      async.nextTick(callback, null, file);
      return;
    }

    const sectionURL = getSectionURL(files, file);
    const menu = file.meta.menu
      .map(menuItem => flagCurrent(menuItem, sectionURL));
    const meta = Object.assign({}, file.meta, { menu });
    async.nextTick(callback, null, Object.assign({}, file, { meta }));
  };
}


// Flag the current menu section.
module.exports = () => {
  return (files, callback) => {
    async.map(
      files,
      processFile(files),
      (error, results) => async.nextTick(callback, error, results)
    );
  };
};
