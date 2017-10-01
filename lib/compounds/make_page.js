const pillr = require('pillr');

const { dateNames, urlNames } = require('../common');
const {
  check,
  enforceDateUpdated,
  flagCurrentMenuSection,
  getLocalBaseURL,
  getSiteURL,
  getURL,
  insertFootnotes,
  populateCategories,
  populateEntries,
  replaceDates,
  replaceURLs,
  transformContent,
  transformFeedEntries,
  transformPage,
} = require('../components');


const DEFAULT_OPTIONS = {
  dateNames,
  urlNames,
  categorySectionTitle: 'all',
  local: false,
};


module.exports = (sourcePath, destinationPath, templatesPath, options) => {
  const opts = Object.assign({}, DEFAULT_OPTIONS, options);
  const base = pillr.compounds.makePage;
  return base(sourcePath, destinationPath, templatesPath, opts)
    .insertManyBefore('renderContent', [
      {
        name: 'check',
        fn: check(),
      },
      {
        name: 'enforceDateUpdated',
        fn: enforceDateUpdated(opts.dateNames),
      },
      {
        name: 'enforceDateUpdated',
        fn: enforceDateUpdated(opts.dateNames),
      },
      {
        name: 'getLocalBaseURL',
        fn: getLocalBaseURL(destinationPath, opts.local),
      },
      {
        name: 'getSiteURL',
        fn: getSiteURL(),
      },
      {
        name: 'getURL',
        fn: getURL(),
      },
    ])
    .insertManyAfter('renderContent', [
      {
        name: 'insertFootnotes',
        fn: insertFootnotes(),
      },
      {
        name: 'transformContent',
        fn: transformContent(),
      },
    ])
    .insertManyBefore('renderPage', [
      {
        name: 'replaceDates',
        fn: replaceDates(Object.values(opts.dateNames)),
      },
      {
        name: 'replaceURLs',
        fn: replaceURLs(Object.values(opts.urlNames)),
      },
      {
        name: 'flagCurrentMenuSection',
        fn: flagCurrentMenuSection(),
      },
      {
        name: 'populateCategories',
        fn: populateCategories(opts.categorySectionTitle),
      },
      {
        name: 'populateEntries',
        fn: populateEntries(opts.dateNames),
      },
      {
        name: 'transformFeedEntries',
        fn: transformFeedEntries(),
      },
    ])
    .insertManyAfter('renderPage', [
      {
        name: 'transformPage',
        fn: transformPage(),
      },
    ]);
};
