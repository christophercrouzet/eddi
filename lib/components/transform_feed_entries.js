const async = require('async');

const { parser, tree, dataAttrNames } = require('../common');
const { mapGroup, walkTree, delNodeAttr } = require('../utils');


const EXTRANEOUS_PROP_NAMES = [
  'class',
  'style',
  ...Object.values(dataAttrNames),
];


// Cleanup properties from a node.
function cleanupProps(node, data, callback) {
  EXTRANEOUS_PROP_NAMES.forEach(propName => delNodeAttr(node, propName));
  async.nextTick(callback, null, node, data);
}


// Process a node from the AST.
function step(node, parentData, callback) {
  const data = parentData;
  const fns = [];
  if (tree.isElementNode(node)) {
    fns.push(cleanupProps);
  }

  async.waterfall(
    [async.constant(node, data), ...fns],
    (error, result) => async.nextTick(callback, error, result, data)
  );
}


// Transform an entry's content.
function transformContent(file) {
  return (entry, callback) => {
    const rootNode = parser.parseFragment(entry.content);
    const initialData = {
      file,
    };
    walkTree(rootNode, step, [initialData], (error) => {
      if (error) {
        async.nextTick(callback, error);
        return;
      }

      const content = parser.serialize(rootNode);
      async.nextTick(callback, null, Object.assign({}, entry, { content }));
    });
  };
}


function parseURLs() {
  return (entry, callback) => {
    async.nextTick(callback, null, entry);
  };
}


// Process a single entry.
function processEntry(file) {
  return (entry, callback) => {
    async.waterfall([
      async.constant(entry),
      transformContent(file),
      parseURLs(),
    ], (error, result) => {
      async.nextTick(callback, error, result);
    });
  };
}


// Process a single file.
function processFile() {
  return (file, callback) => {
    if (file.meta.feed !== true || file.meta.entries === undefined) {
      async.nextTick(callback, null, file);
      return;
    }

    mapGroup(
      file.meta.entries,
      processEntry(file),
      (error, entries) => {
        if (error) {
          async.nextTick(callback, error);
          return;
        }

        const meta = Object.assign({}, file.meta, { entries });
        async.nextTick(callback, null, Object.assign({}, file, { meta }));
      }
    );
  };
}


// Retrieve the file URL.
module.exports = () => {
  return (files, callback) => {
    async.map(
      files,
      processFile(),
      (error, results) => async.nextTick(callback, error, results)
    );
  };
};
