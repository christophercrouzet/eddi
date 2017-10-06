const path = require('path');

const parser = require('parse5');
const tree = require('parse5').treeAdapters.default;


const defaultThemePath = path.join(__dirname, '..', 'themes', 'default');

const dirMetaName = 'eddi.json';
const extNames = {
  page: '.ed',
};
const dateNames = {
  created: 'dateCreated',
  updated: 'dateUpdated',
  latestUpdate: 'dateLatestUpdate',
};
const urlNames = {
  site: 'siteURL',
  url: 'url',
};
const classNames = {
  abbr: 'abbr',
  anchor: 'anchor',
  anchorIcon: 'anchor__icon',
  anchorLink: 'anchor__link',
  blockquote: 'blockquote',
  clearFix: 'clearfix',
  code: 'code',
  codeBlock: 'code_block',
  codeContainer: 'code-container',
  codeInline: 'code_inline',
  deck: 'deck',
  deckItem: 'deck__item',
  deckList: 'deck__list',
  defList: 'deflist',
  defListTitle: 'deflist__title',
  defListDefinition: 'deflist__definition',
  entries: 'entries',
  entriesItemInfo: 'entries__item-info',
  footnotes: 'footnotes',
  footnotesBackRef: 'footnotes__back-ref',
  footnotesItem: 'footnotes__item',
  footnotesLink: 'footnotes__link',
  footnotesList: 'footnotes__list',
  gallery: 'gallery',
  galleryItem: 'gallery__item',
  galleryList: 'gallery__list',
  horizontalRule: 'horizontal-rule',
  info: 'info',
  link: 'link',
  list: 'list',
  listPlain: 'list_plain',
  math: 'math',
  mathBlock: 'math_block',
  mathContainer: 'math-container',
  mathInline: 'math_inline',
  media: 'media',
  mediaCaption: 'media__caption',
  mediaCaptionLink: 'media__caption-link',
  mediaContainer: 'media__container',
  mediaItem: 'media__item',
  mediaLink: 'media__link',
  mediaLinkIcon: 'media__link-icon',
  mediaLinkText: 'media__link-text',
  pageAlign: 'page_size_m',
  pageBlock: 'page__block',
  pageCenter: 'page_center',
  pageHeading: 'page__heading',
  pageHorizontalRule: 'page__horizontal-rule',
  pageMedia: 'page__media',
  pageSection: 'page__section',
  section: 'section',
  sectionPosFirst: 'section_pos_first',
  sectionPosNonFirst: 'section_pos_non-first',
  table: 'table',
  tableBody: 'table__body',
  tableCell: 'table__cell',
  tableCellData: 'table__cell_data',
  tableCellHeader: 'table__cell_header',
  tableContainer: 'table-container',
  tableFoot: 'table__foot',
  tableHead: 'table__head',
  tableRow: 'table__row',
  tableRowData: 'table__row_data',
  tableRowHeader: 'table__row_header',
};
const dataAttrNames = {
  content: 'data-eddi-content',
  noAnchor: 'data-eddi-no-anchor',
  noPageAlign: 'data-eddi-no-page-align',
};
const containerNames = ['deck', 'focus', 'gallery', 'note', 'warning'];
const ns = {
  html: 'http://www.w3.org/1999/xhtml',
};


module.exports = {
  parser,
  tree,
  defaultThemePath,
  dirMetaName,
  extNames,
  dateNames,
  urlNames,
  classNames,
  dataAttrNames,
  containerNames,
  ns,
};
