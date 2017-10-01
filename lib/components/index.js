const check = require('./check');
const enforceDateUpdated = require('./enforce_date_updated');
const expandAssets = require('./expand_assets');
const flagCurrentMenuSection = require('./flag_current_menu_section');
const getLocalBaseURL = require('./get_local_base_url');
const getSiteURL = require('./get_site_url');
const getURL = require('./get_url');
const insertFootnotes = require('./insert_footnotes');
const populateCategories = require('./populate_categories');
const populateEntries = require('./populate_entries');
const prependToPath = require('./prepend_to_path');
const replaceDates = require('./replace_dates');
const replaceURLs = require('./replace_urls');
const transformContent = require('./transform_content');
const transformFeedEntries = require('./transform_feed_entries');
const transformPage = require('./transform_page');


module.exports = {
  check,
  enforceDateUpdated,
  expandAssets,
  flagCurrentMenuSection,
  getLocalBaseURL,
  getSiteURL,
  getURL,
  insertFootnotes,
  populateCategories,
  populateEntries,
  prependToPath,
  replaceDates,
  replaceURLs,
  transformContent,
  transformFeedEntries,
  transformPage,
};
