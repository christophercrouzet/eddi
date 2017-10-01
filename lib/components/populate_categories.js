const async = require('async');

const { getCategory } = require('../utils');


// Flag the current category.
function flagCurrent(categories, currentCategory) {
  return categories.map((category) => {
    const current = category.id === currentCategory;
    return Object.assign({}, category, { current });
  });
}


// Set positional hints.
function setPositionalHints(categories) {
  return categories.map((category, i) => {
    const hints = {
      first: i === 0,
      last: i === categories.length - 1,
    };
    return Object.assign({}, category, hints);
  });
}


// Retrieve specific categories.
function getCategories(files, currentFile, query, sectionTitle) {
  // Filter for categories.
  const filter = (file) => {
    const { section, includeSection } = query;
    return (
      file.meta.index === true
      && (section === undefined || file.meta.section === section)
      && (includeSection === true || file.meta.category !== undefined)
    );
  };

  // Interpret a file as a category object.
  const asCategory = (file) => {
    const { category } = file.meta;
    return category === undefined
      ? { url: file.meta.url, title: sectionTitle }
      : Object.assign({}, { url: file.meta.url }, category);
  };

  let out = files
    .filter(file => filter(file))
    .map(file => asCategory(file));
  out = flagCurrent(out, getCategory(currentFile.meta));
  out = setPositionalHints(out);
  return out;
}


// Process a single file.
function processFile(files, sectionTitle) {
  return (file, callback) => {
    if (file.meta.categories === undefined) {
      async.nextTick(callback, null, file);
      return;
    }

    const categories = Object.entries(file.meta.categories)
      .reduce((obj, [group, query]) => {
        const categoryGroup = getCategories(files, file, query, sectionTitle);
        return Object.assign(obj, { [group]: categoryGroup });
      }, {});
    const meta = Object.assign({}, file.meta, { categories });
    async.nextTick(callback, null, Object.assign({}, file, { meta }));
  };
}


// Populate the metadata with the requested categories.
// Only categories described within an index file are considered.
module.exports = (sectionTitle) => {
  return (files, callback) => {
    async.map(
      files,
      processFile(files, sectionTitle),
      (error, results) => async.nextTick(callback, error, results)
    );
  };
};
