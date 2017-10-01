const async = require('async');

const { getCategory, getLatestUpdate } = require('../utils');


const QUERY_FIELDS = ['category', 'limit', 'mode', 'section'];
const POPULATE_FIELDS = ['categories', 'entries'];


// Sort entries by their similarity to a given target entry.
function sortBySimilarity(entries, target) {
  // Get a similarity score between two entries.
  const getScore = (a, b) => {
    if (a.keywords === undefined || b.keywords === undefined) {
      return 0;
    }

    return a.keywords.filter(tag => b.keywords.includes(tag)).length;
  };

  // Compare two entries.
  const compare = (a, b) => {
    return getScore(target, b) - getScore(target, a);
  };

  return entries
    .filter(entry => entry.url !== target.url)
    .sort((a, b) => compare(a, b));
}


// Sort entries by their created date.
function sortByDateCreated(entries, dateNames) {
  // Compare two entries.
  const compare = (a, b) => {
    return b[dateNames.created].obj - a[dateNames.created].obj;
  };

  return entries.sort((a, b) => compare(a, b));
}


// Limit the number of entries.
function limit(entries, count) {
  if (count === undefined) {
    return entries;
  }

  const { length } = entries;
  return entries
    .filter((entry, i) => i < count)
    .map((entry, i, arr) => {
      const unlistedCount = length - arr.length;
      return Object.assign({}, entry, { unlistedCount });
    });
}


// Set the date of the latest updated entry.
function setDateLatestUpdate(entries, dateNames) {
  const latestUpdate = getLatestUpdate(entries, dateNames);
  return entries
    .map((entry) => {
      return Object.assign({}, entry, {
        [dateNames.latestUpdate]: latestUpdate,
      });
    });
}


// Set the index URL, if any.
function setIndexURL(entries, files, section, category) {
  // Filter for indices.
  const filter = (file) => {
    return (
      file.meta.index === true
      && file.meta.section === section
      && getCategory(file.meta) === category
    );
  };

  const indices = files.filter(file => filter(file));
  if (indices.length !== 1) {
    // It's fine for entries not to have an index URL, e.g.: similar entries
    // might not have a common base index.
    return entries;
  }

  const indexURL = indices[0].meta.url;
  return entries.map(entry => Object.assign({}, entry, { indexURL }));
}


// Set positional hints.
function setPositionalHints(entries) {
  return entries.map((entry, i) => {
    const hints = {
      first: i === 0,
      last: i === entries.length - 1,
    };
    return Object.assign({}, entry, hints);
  });
}


// Retrieve specific entries.
function getEntries(files, currentFile, query, dateNames) {
  // Filter for entries.
  const filter = (file) => {
    const { category, section } = query;
    return (
      file.meta.entry === true
      && (section === undefined || file.meta.section === section)
      && (category === undefined || getCategory(file.meta) === category)
    );
  };

  // Interpret a file as an entry object.
  const asEntry = (file) => {
    const attrs = Object.entries(file.meta)
      .filter(attr => !POPULATE_FIELDS.includes(attr[0]))
      .reduce((obj, [name, value]) => {
        return Object.assign(obj, { [name]: value });
      }, {});
    return Object.assign({}, attrs, { url: file.meta.url });
  };

  // Propagate the non-query fields onto the entries.
  const propagate = (entry) => {
    const attrs = Object.entries(query)
      .filter(attr => !QUERY_FIELDS.includes(attr[0]))
      .reduce((obj, [name, value]) => {
        return Object.assign(obj, { [name]: value });
      }, {});
    return Object.assign({}, entry, attrs);
  };

  let out = files
    .filter(file => filter(file))
    .map(file => asEntry(file))
    .map(entry => propagate(entry));

  if (query.mode === 'similar') {
    if (currentFile.meta.entry !== true) {
      throw new Error(`${currentFile.path}: Cannot retrieve similar entries`);
    }

    out = sortBySimilarity(out, asEntry(currentFile));
  } else {
    out = sortByDateCreated(out, dateNames);
  }

  out = limit(out, query.limit);
  out = setDateLatestUpdate(out, dateNames);
  out = setIndexURL(out, files, query.section, query.category);
  out = setPositionalHints(out);
  return out;
}


// Process a single file.
function processFile(files, entryFiles, dateNames) {
  return (file, callback) => {
    if (file.meta.entries === undefined) {
      async.nextTick(callback, null, file);
      return;
    }

    const entries = Object.entries(file.meta.entries)
      .reduce((obj, [group, query]) => {
        const entryGroup = getEntries(entryFiles, file, query, dateNames);
        return Object.assign(obj, { [group]: entryGroup });
      }, {});
    const meta = Object.assign({}, file.meta, { entries });
    async.nextTick(callback, null, Object.assign({}, file, { meta }));
  };
}


// Populate the metadata with the requested entries.
module.exports = (dateNames, entryFiles = undefined) => {
  return (files, callback) => {
    const entries = entryFiles === undefined ? files : entryFiles;
    async.map(
      files,
      processFile(files, entries, dateNames),
      (error, results) => async.nextTick(callback, error, results)
    );
  };
};
