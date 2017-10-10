const crypto = require('crypto');

const async = require('async');
const hljs = require('highlight.js');
const mathJax = require('mathjax-node');
const SVGO = require('svgo');

const {
  parser,
  tree,
  classNames,
  dataAttrNames,
  containerNames,
  ns,
} = require('../common');
const {
  wrapNode,
  makeMediaNode,
  makeDeckNode,
  makeGalleryNode,
} = require('../html');
const {
  walkTree,
  getNodeAttr,
  getNodeAttrMap,
  getNodeURIAttrs,
  mergeNodeAttr,
  splitNodeAttrValues,
  joinTextNodeContents,
  resolveFullURI,
} = require('../utils');


const ContentType = {
  REGULAR: 0,
  HEADING: 1,
  MEDIA: 2,
  CODE: 3,
  CONTAINER: 4,
  ENTRIES: 5,
  FOOTNOTES: 6,
  INLINE: 7,
};

const LANGUAGE_PREFIX = 'language-';
const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const MEDIA_TAGS = ['img', 'video'];
const OWN_LINK_CONTENT_TYPES = [
  ContentType.ENTRIES,
];
const OWN_LINK_CLASS_NAMES = [
  classNames.anchorLink,
  classNames.footnotesLink,
  classNames.mediaLink,
];
const CONTAINERS = {
  deck: { collectionName: 'decks', fn: makeDeckNode },
  gallery: { collectionName: 'galleries', fn: makeGalleryNode }
}

const MATH_RE = /(?:\\\(([\s\S]*?)\\\))|(?:\\\[([\s\S]*?)\\\])/g;


// Retrieve the language to highlight from a 'code' node.
function getLanguage(node) {
  // Filter highlighting attributes.
  const filter = (attr) => {
    return (
      attr === 'no-highlight'
      || attr === 'plain'
      || attr === 'text'
      || attr.startsWith(LANGUAGE_PREFIX)
    );
  };
  const languages = splitNodeAttrValues(node, 'class')
    .filter(attr => filter(attr));
  if (languages.length !== 1) {
    return;
  }

  const language = languages[0];
  if (language.startsWith(LANGUAGE_PREFIX)) {
    return language.slice(LANGUAGE_PREFIX.length);
  }

  return null;
}


// Retrieve the metadata for a given media node element.
function getMediaMeta(node, meta) {
  const src = getNodeAttr(node, 'src');
  if (
    !('medias' in meta)
    || src === undefined
    || !(src.value in meta.medias)
  ) {
    return undefined;
  }

  return meta.medias[src.value];
}


// Retrieve the metadata for a given media container node element.
function getMediaContainerMeta(node, meta, containerType) {
  const containerCollectionName = CONTAINERS[containerType].collectionName;
  const value = joinTextNodeContents(node).trim();
  if (
    !(containerCollectionName in meta)
    || value === undefined
    || !(value in meta[containerCollectionName])
  ) {
    return undefined;
  }

  const containerMeta = meta[containerCollectionName][value];
  const medias = containerMeta.medias === undefined
    ? []
    : containerMeta.medias.map(media => meta.medias[media]);
  return Object.assign({}, containerMeta, { medias });
}


// Check if a node represents a media.
function isMedia(node, meta) {
  return (
    MEDIA_TAGS.includes(tree.getTagName(node))
    && getMediaMeta(node, meta) !== undefined
  );
}


// Check if a node represents a media container.
function isMediaContainer(node, meta, containerType) {
  return (
    tree.getTagName(node) === 'div'
    && getMediaContainerMeta(node, meta, containerType) !== undefined
  );
}


// Retrieve the content type of a paragraph element.
function getParagraphContentType(node, meta) {
  const children = tree.getChildNodes(node);

  const mediaNodes = children.filter(child => isMedia(child, meta));
  if (mediaNodes.length) {
    return children.length === 1
      ? ContentType.MEDIA
      : ContentType.INLINE;
  }

  return ContentType.REGULAR;
}


// Remove the child nodes that are not element nodes.
function removeNonElementChildNodes(rootNode, data, callback) {
  tree.getChildNodes(rootNode)
    .filter(child => !tree.isElementNode(child))
    .forEach(child => tree.detachNode(child));

  async.nextTick(callback, null, rootNode, data);
}


// Apply the clear fix class helper to restore the content flow after a node.
function applyClearFix(node, data, callback) {
  if (data.contentType !== ContentType.INLINE) {
    async.nextTick(callback, null, node, data);
    return;
  }

  mergeNodeAttr(node, 'class', classNames.clearFix);
  async.nextTick(callback, null, node, data);
}


// Replace a media container node.
function replaceMediaContainers(node, data, callback) {
  if (
    !(data.containerType in CONTAINERS)
    || !isMediaContainer(node, data.file.meta, data.containerType)
  ) {
    async.nextTick(callback, null, node, data);
    return;
  }

  const containerMeta = getMediaContainerMeta(
    node,
    data.file.meta,
    data.containerType
  );
  const containerNode = CONTAINERS[data.containerType].fn(containerMeta);
  tree.insertBefore(tree.getParentNode(node), containerNode, node);
  tree.detachNode(node);
  async.nextTick(callback, null, containerNode, data);
}


// Highlight a code element.
function highlightCode(node, data, callback) {
  if (
    data.contentType !== ContentType.CODE
    || tree.getTagName(node) !== 'code'
  ) {
    async.nextTick(callback, null, node, data);
    return;
  }

  hljs.configure({ classPrefix: 'hljs__' });
  const language = getLanguage(node);
  tree.getChildNodes(node)
    .filter(child => tree.isTextNode(child))
    .forEach((textNode) => {
      const value = tree.getTextNodeContent(textNode);
      let result;
      if (language === undefined) {
        result = hljs.highlightAuto(value);
      } else if (language !== null) {
        result = hljs.highlight(language, value);
      }

      if (result === undefined) {
        return;
      }

      const ast = parser.parseFragment(result.value);
      tree.getChildNodes(ast)
        .forEach(child => tree.insertBefore(node, child, textNode));
      tree.detachNode(textNode);
    });

  async.nextTick(callback, null, node, data);
}


// Set the abbr class on an element node.
function markAbbr(node, data, callback) {
  if (tree.getTagName(node) !== 'abbr') {
    async.nextTick(callback, null, node, data);
    return;
  }

  mergeNodeAttr(node, 'class', classNames.abbr);
  async.nextTick(callback, null, node, data);
}


// Set the blockquote classes on an element node.
function markBlockquote(node, data, callback) {
  if (tree.getTagName(node) !== 'blockquote') {
    async.nextTick(callback, null, node, data);
    return;
  }

  mergeNodeAttr(node, 'class', classNames.blockquote);
  async.nextTick(callback, null, node, data);
}


// Set the code classes on an element node.
function markCode(node, data, callback) {
  let value;
  const tagName = tree.getTagName(node);
  if (tagName === 'code') {
    value = classNames.code;
    if (tree.getTagName(tree.getParentNode(node)) === 'pre') {
      value = `${value} ${classNames.codeBlock}`;
    } else {
      value = `${value} ${classNames.codeInline}`;
    }
  } else if (tagName === 'pre') {
    value = `${classNames.codeContainer} ${classNames.pageBlock}`;
  }

  if (value !== undefined) {
    mergeNodeAttr(node, 'class', value);
  }

  async.nextTick(callback, null, node, data);
}


// Set the container classes on an element node.
function markContainer(node, data, callback) {
  if (data.contentType !== ContentType.CONTAINER) {
    async.nextTick(callback, null, node, data);
    return;
  }

  if (data.contentLevel === 1) {
    if (data.containerType === 'gallery') {
      mergeNodeAttr(node, 'class', classNames.pageCenter);
    } else {
      mergeNodeAttr(node, 'class', classNames.pageBlock);
    }
  }

  async.nextTick(callback, null, node, data);
}


// Set the definition list classes on an element node.
function markDefinitionList(node, data, callback) {
  let value;
  const tagName = tree.getTagName(node);
  if (tagName === 'dl') {
    value = `${classNames.defList} ${classNames.pageBlock}`;
  } else if (tagName === 'dt') {
    value = classNames.defListTitle;
  } else if (tagName === 'dd') {
    value = classNames.defListDefinition;
  }

  if (value !== undefined) {
    mergeNodeAttr(node, 'class', value);
  }

  async.nextTick(callback, null, node, data);
}


// Set the marking classes on an element node.
function markHeading(node, data, callback) {
  const tagName = tree.getTagName(node);
  if (!HEADING_TAGS.includes(tagName)) {
    async.nextTick(callback, null, node, data);
    return;
  }

  mergeNodeAttr(node, 'class', tagName);
  if (data.contentType !== ContentType.HEADING || tagName === 'h1') {
    async.nextTick(callback, null, node, data);
    return;
  }

  const value = `${classNames.pageHeading}`;
  mergeNodeAttr(node, 'class', value);
  async.nextTick(callback, null, node, data);
}


// Set the horizontal classes on an element node.
function markHorizontalRule(node, data, callback) {
  if (tree.getTagName(node) !== 'hr') {
    async.nextTick(callback, null, node, data);
    return;
  }

  const value = `${classNames.horizontalRule} ${classNames.pageHorizontalRule}`;
  mergeNodeAttr(node, 'class', value);
  async.nextTick(callback, null, node, data);
}


// Set the link's class on an element node.
function markLink(node, data, callback) {
  const attrs = splitNodeAttrValues(node, 'class');
  if (
    OWN_LINK_CONTENT_TYPES.includes(data.contentType)
    || OWN_LINK_CLASS_NAMES.some(className => attrs.includes(className))
    || tree.getTagName(node) !== 'a'
  ) {
    async.nextTick(callback, null, node, data);
    return;
  }

  mergeNodeAttr(node, 'class', classNames.link);
  async.nextTick(callback, null, node, data);
}


// Set the list classes on an element node.
function markList(node, data, callback) {
  const tagName = tree.getTagName(node);
  if (tagName !== 'ol' && tagName !== 'ul') {
    async.nextTick(callback, null, node, data);
    return;
  }

  mergeNodeAttr(node, 'class', classNames.list);
  async.nextTick(callback, null, node, data);
}


// Set the table classes on an element node.
function markTable(node, data, callback) {
  let value;
  const tagName = tree.getTagName(node);
  if (tagName === 'table') {
    value = classNames.table;
    const wrappingNode = wrapNode(node, 'div');
    mergeNodeAttr(
      wrappingNode,
      'class',
      `${classNames.tableContainer} ${classNames.pageBlock}`
    );
    mergeNodeAttr(wrappingNode, dataAttrNames.noPageAlign, '');
  } else if (tagName === 'thead') {
    value = classNames.tableHead;
  } else if (tagName === 'tbody') {
    value = classNames.tableBody;
  } else if (tagName === 'tfoot') {
    value = classNames.tableFoot;
  } else if (tagName === 'tr') {
    const children = tree.getChildNodes(node);
    value = children.some(child => tree.getTagName(child) === 'th')
      ? classNames.tableRowHeader
      : classNames.tableRowData;
    value = `${classNames.tableRow} ${value}`;
  } else if (tagName === 'th') {
    value = `${classNames.tableCell} ${classNames.tableCellHeader}`;
  } else if (tagName === 'td') {
    value = `${classNames.tableCell} ${classNames.tableCellData}`;
  }

  if (value !== undefined) {
    mergeNodeAttr(node, 'class', value);
  }

  async.nextTick(callback, null, node, data);
}


// Render any TeX math notation found in child text nodes.
function renderMath(rootNode, data, callback) {
  // Convert any math notation into SVG.
  const typeset = () => {
    return (part, cb) => {
      if (part.type === 'text') {
        async.nextTick(cb, null, part);
        return;
      }

      const options = {
        math: part.content,
        format: 'TeX',
        svg: true,
      };
      mathJax.typeset(options, (result) => {
        if (result.errors) {
          async.nextTick(cb, result.errors);
          return;
        }

        const content = result.svg;
        async.nextTick(cb, null, Object.assign({}, part, { content }));
      });
    };
  };

  // Optimize any SVG.
  const optimize = () => {
    return (part, cb) => {
      if (part.type === 'text') {
        async.nextTick(cb, null, part);
        return;
      }

      const options = {
        plugins: [
          { cleanupIDs: false },
        ],
      };
      new SVGO(options).optimize(part.content, (result) => {
        if (result.errors) {
          async.nextTick(cb, result.errors);
          return;
        }

        const content = result.data;
        async.nextTick(cb, null, Object.assign({}, part, { content }));
      });
    };
  };

  // Filter text nodes.
  const filterTextNode = () => {
    return (node, cb) => {
      const keep = tree.isTextNode(node);
      async.nextTick(cb, null, keep);
    };
  };

  // Split a text node for each math expression found.
  const splitMathExpressions = () => {
    return (node, cb) => {
      const parts = [];
      const text = tree.getTextNodeContent(node);
      let match;
      let latestIdx = 0;
      while ((match = MATH_RE.exec(text)) !== null) {
        if (match.index !== latestIdx) {
          const content = text.slice(latestIdx, match.index);
          parts.push({ content, type: 'text' });
        }

        const group = match[1] === undefined ? 2 : 1;
        const type = group === 1 ? 'inline' : 'block';
        const content = match[group];
        const id = crypto.createHash('md5').update(content).digest('hex');
        latestIdx = match.index + match[0].length;
        parts.push({ type, content, id, raw: content });
      }

      if (text.length !== latestIdx) {
        const content = text.slice(latestIdx, text.length);
        parts.push({ content, type: 'text' });
      }

      async.nextTick(cb, null, { node, parts });
    };
  };

  // Filter the parts containing at least one math expression.
  const filterNodeWithMath = () => {
    return ({ node, parts }, cb) => {
      const keep = parts.some(part => part.type !== 'text');
      async.nextTick(cb, null, keep);
    };
  };

  // Render the math parts of a node.
  const render = () => {
    return ({ node, parts }, cb) => {
      async.waterfall([
        async.constant(parts),
        (parts_, cb_) => async.map(parts_, typeset(), cb_),
        (parts_, cb_) => async.map(parts_, optimize(), cb_),
      ], (error, result) => {
        if (error) {
          async.nextTick(cb, error);
          return;
        }

        async.nextTick(cb, null, { node, parts: result });
      });
    };
  };

  // Rebuild the node with new nodes defined by the given parts.
  const rebuildNode = () => {
    return ({ node, parts }, cb) => {
      try {
        const parent = tree.getParentNode(node);
        parts.forEach((part) => {
          if (part.type === 'text') {
            tree.insertTextBefore(parent, part.content, node);
          } else {
            const imgNode = tree.createElement('img', ns.html, [
              {
                name: 'src',
                value: `./${part.id}.svg`,
              },
              {
                name: 'alt',
                value: part.raw,
              },
            ]);
            tree.insertBefore(parent, imgNode, node);

            let classValue = classNames.math;
            if (part.type === 'block') {
              classValue = `${classValue} ${classNames.mathBlock}`;
              const wrappingNode = wrapNode(imgNode, 'div');
              mergeNodeAttr(wrappingNode, 'class', classNames.mathContainer);
              mergeNodeAttr(wrappingNode, dataAttrNames.noPageAlign, '');
            } else {
              classValue = `${classValue} ${classNames.mathInline}`;
            }

            mergeNodeAttr(imgNode, 'class', classValue);
          }
        });

        tree.detachNode(node);
        async.nextTick(cb, null, { node, parts });
      } catch (error) {
        async.nextTick(cb, error);
      }
    };
  };

  // Store each SVG to process it later on.
  const storeSVG = () => {
    return ({ node, parts }, cb) => {
      parts
        .filter(part => part.type !== 'text')
        .forEach(part => Object.assign(data.svgs, { [part.id]: part.content }));

      async.nextTick(cb, null, { node, parts });
    };
  };

  async.waterfall([
    async.constant(tree.getChildNodes(rootNode)),
    (nodes, cb) => async.filter(nodes, filterTextNode(), cb),
    (nodes, cb) => async.map(nodes, splitMathExpressions(), cb),
    (nodes, cb) => async.filter(nodes, filterNodeWithMath(), cb),
    (nodes, cb) => async.map(nodes, render(), cb),
    (nodes, cb) => async.map(nodes, rebuildNode(), cb),
    (nodes, cb) => async.map(nodes, storeSVG(), cb),
  ], (error) => {
    if (error) {
      async.nextTick(callback, error);
      return;
    }

    async.nextTick(callback, null, rootNode, data);
  });
}


// Replace a media node.
function replaceMedia(node, data, callback) {
  if (!isMedia(node, data.file.meta)) {
    async.nextTick(callback, null, node, data);
    return;
  }

  const mediaMeta = getMediaMeta(node, data.file.meta);
  const attrs = getNodeAttrMap(node, attr => attr.name !== 'src');
  const alignToPage = data.contentType === ContentType.INLINE
    ? true
    : mediaMeta.alignToPage;
  const options = Object.assign({}, mediaMeta, attrs, { alignToPage });
  const mediaNode = makeMediaNode(mediaMeta.size, options);

  if (data.contentType === ContentType.MEDIA) {
    mergeNodeAttr(mediaNode, 'class', classNames.pageMedia);
  }

  tree.insertBefore(tree.getParentNode(node), mediaNode, node);
  tree.detachNode(node);
  async.nextTick(callback, null, mediaNode, data);
}


// Resolve any URI.
function resolveURIs(node, data, callback) {
  getNodeURIAttrs(node)
    .forEach((attr) => {
      attr.value = resolveFullURI(attr.value, data.file.meta, data.files);
    });
  async.nextTick(callback, null, node, data);
}


// Identify the content of a top-level node.
function identifyContent(node, meta) {
  const tagName = tree.getTagName(node);
  const attrs = splitNodeAttrValues(node, 'class');
  if (containerNames.some(name => attrs.includes(name))) {
    return ContentType.CONTAINER;
  } else if (attrs.includes(classNames.entries)) {
    return ContentType.ENTRIES;
  } else if (attrs.includes(classNames.footnotes)) {
    return ContentType.FOOTNOTES;
  } else if (tagName === 'pre') {
    return ContentType.CODE;
  } else if (HEADING_TAGS.includes(tagName)) {
    return ContentType.HEADING;
  } else if (tagName === 'p') {
    return getParagraphContentType(node, meta);
  }

  return ContentType.REGULAR;
}


// Process the data for a given node.
function stepData(node, parentData) {
  let { contentLevel, contentType, containerType } = parentData;
  if (contentLevel === 0) {
    contentType = identifyContent(node, parentData.file.meta);
    if (contentType === ContentType.CONTAINER) {
      const attrs = splitNodeAttrValues(node, 'class');
      containerType = containerNames.find(name => attrs.includes(name));
    }
  }

  contentLevel += 1;
  return Object.assign({}, parentData, {
    contentLevel,
    contentType,
    containerType,
  });
}


// Process a node from the AST.
function step(node, parentData, callback) {
  const data = stepData(node, parentData);
  const fns = [];
  if (tree.isElementNode(node)) {
    if (data.contentLevel === 0) {
      // Content root node.
      fns.push(removeNonElementChildNodes);
    } else if (data.contentLevel > 0) {
      if (data.contentLevel === 1) {
        // Top level content node.
        fns.push(applyClearFix);
      }

      // Any content node.
      fns.push(replaceMediaContainers);
      fns.push(highlightCode);
      fns.push(markAbbr);
      fns.push(markBlockquote);
      fns.push(markCode);
      fns.push(markContainer);
      fns.push(markDefinitionList);
      fns.push(markHeading);
      fns.push(markHorizontalRule);
      fns.push(markLink);
      fns.push(markList);
      fns.push(markTable);
      fns.push(renderMath);
      fns.push(replaceMedia);
    }

    // Any node.
    fns.push(resolveURIs);
  }

  async.waterfall(
    [async.constant(node, data), ...fns],
    (error, result) => async.nextTick(callback, error, result, data)
  );
}


// Convert the stored SVGs to assets to be saved later.
function svgToAssets(data, callback) {
  const assets = data.assets === undefined ? [] : data.assets;
  const svgAssets = Object.entries(data.svgs)
    .map(([id, content]) => ({ path: `${id}.svg`, data: content }));

  data.assets = [...assets, ...svgAssets];
  async.nextTick(callback, null);
}


// Final step to run upon finishing walking the tree.
function finalize(data, callback) {
  async.applyEachSeries(
    [svgToAssets],
    data,
    error => async.nextTick(callback, error, data)
  );
}


// Process a single file.
function processFile(files) {
  return (file, callback) => {
    if (file.meta.filePath.ext !== '.html') {
      async.nextTick(callback, null, file);
      return;
    }

    const rootNode = parser.parseFragment(file.meta.content);
    const initialData = {
      file,
      files,
      contentLevel: -1,
      contentType: undefined,
      containerType: undefined,
      svgs: {},
    };
    async.waterfall([
      cb => walkTree(rootNode, step, [initialData], cb),
      (data, cb) => finalize(data, cb),
    ], (error, data) => {
      if (error) {
        async.nextTick(callback, error);
        return;
      }

      const content = parser.serialize(rootNode);
      const { assets } = data;
      const meta = Object.assign({}, file.meta, { content, assets });
      async.nextTick(callback, null, Object.assign({}, file, { meta }));
    });
  };
}


// Transform the page's HTML.
module.exports = () => {
  return (files, callback) => {
    async.map(
      files,
      processFile(files),
      (error, results) => async.nextTick(callback, error, results)
    );
  };
};
