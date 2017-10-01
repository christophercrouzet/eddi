const async = require('async');
const slug = require('slug');

const { parser, tree, classNames, dataAttrNames } = require('../common');
const { wrapNodesBefore, toAnchorNode } = require('../html');
const {
  walkTree,
  walkTreeSync,
  getNodeAttr,
  delNodeAttr,
  mergeNodeAttr,
  joinTextNodeContents,
} = require('../utils');


const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const HEADING_RECURSE_TAGS = ['header', 'footer', 'section'];
const PAGE_ALIGN_RECURSE_TAGS = ['section'];
const SECTIONING_HEADING_TAGS = ['header', 'h1'];


// Check if a node represents a content root node.
function isContentRoot(node) {
  return getNodeAttr(node, dataAttrNames.content) !== undefined;
}


// Convert an element into an anchor node.
function toAnchor(node, data, callback) {
  const recurse = (n) => {
    const tagName = tree.getTagName(n);
    if (getNodeAttr(n, dataAttrNames.noAnchor) !== undefined) {
      return;
    } else if (HEADING_RECURSE_TAGS.includes(tagName)) {
      tree.getChildNodes(n).forEach(child => recurse(child));
      return;
    } else if (!HEADING_TAGS.includes(tagName)) {
      return;
    }

    const text = joinTextNodeContents(n);
    const id = slug(text, { mode: 'rfc3986' });
    toAnchorNode(n, id);
  };

  recurse(node);
  async.nextTick(callback, null, node, data);
}


// Remove the abbreviations found on headings.
function removeHeadingAbbr(node, data, callback) {
  const parentNode = tree.getParentNode(node);
  if (
    tree.getTagName(node) !== 'abbr'
    || !HEADING_TAGS.includes(tree.getTagName(parentNode))
  ) {
    async.nextTick(callback, null, node, data);
    return;
  }

  tree.getChildNodes(node)
    .forEach(child => tree.insertBefore(parentNode, child, node));
  tree.detachNode(node);
  async.nextTick(callback, null, undefined, data);
}


// Process the data for a given node.
function stepData(node, parentData) {
  let { contentLevel } = parentData;
  if (contentLevel < 0) {
    if (isContentRoot(node)) {
      contentLevel = 0;
    }
  } else if (contentLevel === 0) {
    contentLevel = 1;
  } else {
    contentLevel += 1;
  }

  return Object.assign({}, parentData, { contentLevel });
}


// Process a node from the AST.
function step(node, parentData, callback) {
  const data = stepData(node, parentData);
  const fns = [];
  if (tree.isElementNode(node)) {
    if (data.contentLevel === 0) {
      // Content root node.
      data.contentRoot.node = node;
    } else if (data.contentLevel > 0) {
      if (data.contentLevel === 1) {
        // Top level content node.
        fns.push(toAnchor);
      }

      fns.push(removeHeadingAbbr);
    }
  }

  async.waterfall(
    [async.constant(node, data), ...fns],
    (error, result) => async.nextTick(callback, error, result, data)
  );
}


// Align the children of the content root to the page's layout.
function alignToPage(data, callback) {
  // Check whether a node has the 'no page align' data attr set.
  const hasNoPageAlignDataAtrr = (node) => {
    return getNodeAttr(node, dataAttrNames.noPageAlign) !== undefined;
  };

  // Check if a node needs to be aligned.
  const needsAlignment = (node) => {
    const tagName = tree.getTagName(node);
    const children = tree.getChildNodes(node);
    return (
      !PAGE_ALIGN_RECURSE_TAGS.includes(tagName)
      && tagName !== 'pre'
      && !hasNoPageAlignDataAtrr(node)
      && !children.some(child => hasNoPageAlignDataAtrr(child))
    );
  };

  // Group consecutive nodes that need to be aligned.
  const groupByAlignment = (arr, node) => {
    if (needsAlignment(node)) {
      const last = arr[arr.length - 1];
      last.push(node);
    } else {
      arr.push([]);
    }

    return arr;
  };

  // Wrap a bunch of nodes in a div element.
  const wrapNodes = (nodes) => {
    const divNode = wrapNodesBefore(nodes, 'div', nodes[0]);
    mergeNodeAttr(divNode, 'class', classNames.pageAlign);
  };

  // Recursive part.
  const recurse = (node) => {
    tree.getChildNodes(node)
      .filter(child => tree.isElementNode(child))
      .reduce((arr, child) => groupByAlignment(arr, child), [[]])
      .filter(group => group.length > 0)
      .map(group => wrapNodes(group));

    tree.getChildNodes(node)
      .filter(child => PAGE_ALIGN_RECURSE_TAGS.includes(tree.getTagName(child)))
      .forEach(child => recurse(child));
  };

  const { node } = data.contentRoot;
  if (node === undefined) {
    async.nextTick(callback, null);
    return;
  }

  recurse(node);
  async.nextTick(callback, null);
}


// Make a section around the primary headings found under the content root.
function makeSectioningExplicit(data, callback) {
  // Filter the headings.
  const filterSectioningHeadings = (node) => {
    return SECTIONING_HEADING_TAGS.includes(tree.getTagName(node));
  };

  // Retrieve the nodes making up each section.
  const getSectionNodes = (node, i, arr, nodes) => {
    const from = nodes.indexOf(node);
    const to = i + 1 === arr.length ? nodes.length : nodes.indexOf(arr[i + 1]);
    return nodes.filter((n, j) => j >= from && j < to);
  };

  // Create the section.
  const makeSection = (nodes, i) => {
    const sectionNode = wrapNodesBefore(nodes, 'section', nodes[0]);
    const className = i === 0
      ? classNames.sectionPosFirst
      : classNames.sectionPosNonFirst;
    mergeNodeAttr(
      sectionNode,
      'class',
      `${classNames.section} ${className} ${classNames.pageSection}`
    );
    return sectionNode;
  };

  const rootNode = data.contentRoot.node;
  if (rootNode === undefined) {
    async.nextTick(callback, null);
    return;
  }

  const nodes = tree.getChildNodes(rootNode);
  const headings = nodes.filter(node => filterSectioningHeadings(node));
  if (headings.length < 2) {
    async.nextTick(callback, null);
    return;
  }

  headings
    .map((node, i, arr) => getSectionNodes(node, i, arr, nodes))
    .map((nodeGroup, i) => makeSection(nodeGroup, i));

  async.nextTick(callback, null);
}


// Remove any internal data attribute.
function cleanUpDataAttrs(data, callback) {
  walkTreeSync(data.root, (node) => {
    if (!tree.isElementNode(node)) {
      return;
    }

    Object.values(dataAttrNames)
      .forEach(dataAttrName => delNodeAttr(node, dataAttrName));
  });
  async.nextTick(callback, null);
}


// Final step to run upon finishing walking the tree.
function finalize(data, callback) {
  async.applyEachSeries(
    [makeSectioningExplicit, alignToPage, cleanUpDataAttrs],
    data,
    error => async.nextTick(callback, error, data)
  );
}


// Process a single file.
function processFile() {
  return (file, callback) => {
    if (file.meta.filePath.ext !== '.html') {
      async.nextTick(callback, null, file);
      return;
    }

    const rootNode = parser.parse(file.data);
    const initialData = {
      file,
      root: rootNode,
      contentLevel: -1,
      // Mutable properties to be mutated during the stepping.
      contentRoot: { node: undefined },
    };
    async.waterfall([
      cb => walkTree(rootNode, step, [initialData], cb),
      (data, cb) => finalize(data, cb),
    ], (error) => {
      if (error) {
        async.nextTick(callback, error);
        return;
      }

      const data = parser.serialize(rootNode);
      async.nextTick(callback, null, Object.assign({}, file, { data }));
    });
  };
}


// Transform the page's HTML.
module.exports = () => {
  return (files, callback) => {
    async.map(
      files,
      processFile(),
      (error, results) => async.nextTick(callback, error, results)
    );
  };
};
