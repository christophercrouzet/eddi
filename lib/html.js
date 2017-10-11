const { parser, tree, classNames, dataAttrNames, ns } = require('./common');
const {
  getMediaWidth,
  walkTreeSync,
  setNodeAttr,
  mergeNodeAttr,
} = require('./utils');


const DEFAULT_OPTIONS = {
  footnotes: {},
  media: {
    type: 'image',
    alt: '',
    poster: '',
    link: undefined,
    linkIcon: undefined,
    linkText: undefined,
    captions: [],
    align: 'default',
    shape: 'default',
    alignToPage: false,
    fullWidth: false,
    captionAlign: 'default',
    styles: [],
  },
  deck: {
    title: undefined,
    medias: [],
  },
  gallery: {
    rowHeight: 240,
    alignToPage: false,
    width: undefined,
    medias: [],
  }
};


// Serialize a node as an HTML string.
function toHTML(node) {
  const rootNode = tree.createDocumentFragment();
  tree.appendChild(rootNode, node);
  return parser.serialize(rootNode);
}


// Wrap a node within a new node.
function wrapNode(node, tagName) {
  const wrapperNode = tree.createElement(tagName, ns.html, []);
  tree.insertBefore(tree.getParentNode(node), wrapperNode, node);
  tree.detachNode(node);
  tree.appendChild(wrapperNode, node);
  return wrapperNode;
}


// Wrap a group of adjacent nodes beofre a given reference node.
function wrapNodesBefore(nodes, tagName, referenceNode) {
  const wrappingNode = tree.createElement(tagName, ns.html, []);

  const parent = tree.getParentNode(referenceNode);
  tree.insertBefore(parent, wrappingNode, referenceNode);
  nodes.forEach((node) => {
    tree.detachNode(node);
    tree.appendChild(wrappingNode, node);
  });
  return wrappingNode;
}


// Render a footnotes block.
function makeFootnotesNode(footnotes) {
  const footnotesNode = tree.createElement('aside', ns.html, [
    {
      name: 'class',
      value: classNames.footnotes,
    },
  ]);

  const headingNode = tree.createElement('h2', ns.html, []);
  tree.insertText(headingNode, 'Footnotes');

  const listNode = tree.createElement('ol', ns.html, [
    {
      name: 'class',
      value: classNames.footnotesList,
    },
  ]);

  footnotes.forEach((footnote) => {
    const itemNode = tree.createElement('li', ns.html, [
      {
        name: 'id',
        value: `fn${footnote.id}`,
      },
      {
        name: 'class',
        value: classNames.footnotesItem,
      },
    ]);
    const linkNode = tree.createElement('a', ns.html, [
      {
        name: 'class',
        value: classNames.footnotesLink,
      },
      {
        name: 'href',
        value: `#fnref${footnote.id}`,
      },
    ]);
    const backRefNode = tree.createElement('span', ns.html, [
      {
        name: 'class',
        value: classNames.footnotesBackRef,
      }
    ]);
    tree.appendChild(listNode, itemNode);
    const contentRootNode = parser.parseFragment(footnote.content);
    tree.getChildNodes(contentRootNode)
      .forEach(node => tree.appendChild(itemNode, node));
    tree.appendChild(itemNode, linkNode);
    tree.appendChild(linkNode, backRefNode);
    tree.insertText(backRefNode, '↩');
  });

  tree.appendChild(footnotesNode, headingNode);
  tree.appendChild(footnotesNode, listNode);
  return footnotesNode;
}


// Render a media block.
function makeMediaNode(size, options) {
  const opts = Object.assign({}, DEFAULT_OPTIONS.media, options);
  const paddingBottom = `${(size[1] / size[0]) * 100.0}%`;
  const width = getMediaWidth(size, opts.styles, opts.fullWidth);
  const styles = opts.styles.filter(style => style.name !== 'width');
  styles.push({ name: 'width', value: width });

  const mediaNode = tree.createElement('span', ns.html, [
    {
      name: 'class',
      value: `${classNames.media} ${classNames.media}_align_${opts.align} \
        ${classNames.media}_shape_${opts.shape}`,
    },
    {
      name: 'style',
      value: styles.map(({ name, value }) => `${name}:${value};`).join(''),
    },
  ]);
  if (opts.alignToPage !== true) {
    setNodeAttr(mediaNode, dataAttrNames.noPageAlign, '');
  }

  const containerTagName = opts.link === undefined ? 'span' : 'a';
  const containerNode = tree.createElement(containerTagName, ns.html, [
    {
      name: 'class',
      value: classNames.mediaContainer,
    },
    {
      name: 'style',
      value: `padding-bottom: ${paddingBottom};`,
    },
  ]);
  if (opts.link !== undefined) {
    mergeNodeAttr(containerNode, 'class', classNames.mediaLink);
    mergeNodeAttr(containerNode, 'href', opts.link);
  }

  let itemNode;
  if (opts.type === 'image') {
    itemNode = tree.createElement('img', ns.html, [
      {
        name: 'class',
        value: classNames.mediaItem,
      },
      {
        name: 'src',
        value: opts.src,
      },
      {
        name: 'alt',
        value: opts.alt,
      },
    ]);
  } else if (opts.type === 'video') {
    itemNode = tree.createElement('video', ns.html, [
      {
        name: 'class',
        value: classNames.mediaItem,
      },
      {
        name: 'src',
        value: opts.src,
      },
      {
        name: 'poster',
        value: opts.poster,
      },
      {
        name: 'controls',
        value: '',
      },
    ]);
  } else {
    throw new Error(`${opts.src}: No valid media 'type' found`);
  }

  let linkIconNode;
  let linkTextNode;
  if (opts.link !== undefined) {
    if (opts.linkIcon !== undefined) {
      linkIconNode = tree.createElement('span', ns.html, [
        {
          name: 'class',
          value: `${classNames.mediaLinkIcon} icon-${opts.linkIcon}`,
        },
      ]);
    }

    if (opts.linkText !== undefined) {
      linkTextNode = tree.createElement('span', ns.html, [
        {
          name: 'class',
          value: classNames.mediaLinkText,
        },
      ]);
      tree.insertText(linkTextNode, opts.linkText);
    }
  }

  const captionNodes = opts.captions
    .map((caption, i) => {
      const captionNode = tree.createElement('span', ns.html, [
        {
          name: 'class',
          value: `${classNames.info} ${classNames.mediaCaption} \
            ${classNames.mediaCaption}_align_${opts.captionAlign}`,
        },
      ]);
      if (i === 0) {
        mergeNodeAttr(
          captionNode,
          'class',
          `${classNames.mediaCaption}_pos_first`
        );
      }

      const contentRootNode = parser.parseFragment(caption);
      walkTreeSync(contentRootNode, (node) => {
        if (tree.isElementNode(node) && tree.getTagName(node) === 'a') {
          mergeNodeAttr(node, 'class', classNames.mediaCaptionLink);
        }
      });
      tree.getChildNodes(contentRootNode)
        .forEach(node => tree.appendChild(captionNode, node));
      return captionNode;
    });

  tree.appendChild(mediaNode, containerNode);
  tree.appendChild(containerNode, itemNode);
  if (linkIconNode !== undefined) {
    tree.appendChild(containerNode, linkIconNode);
  }

  if (linkTextNode !== undefined) {
    tree.appendChild(containerNode, linkTextNode);
  }

  captionNodes.forEach(node => tree.appendChild(mediaNode, node));
  return mediaNode;
}


// Render a deck block.
function makeDeckNode(options) {
  // Wrap a media node into a list item.
  const wrap = (mediaNode, parentNode) => {
    const listItemNode = tree.createElement('li', ns.html, [
      {
        name: 'class',
        value: classNames.deckItem,
      },
    ]);

    tree.appendChild(listItemNode, mediaNode);
    tree.appendChild(parentNode, listItemNode);
    return listItemNode;
  };

  const opts = Object.assign({}, DEFAULT_OPTIONS.deck, options);
  const deckNode = tree.createElement('div', ns.html, [
    {
      name: 'class',
      value: classNames.deck,
    }
  ]);

  if (opts.title !== undefined) {
    const titleNode = tree.createElement('p', ns.html, []);
    const strongNode = tree.createElement('strong', ns.html, []);
    tree.insertText(strongNode, opts.title);
    tree.appendChild(titleNode, strongNode);
    tree.appendChild(deckNode, titleNode);
  }

  const listNode = tree.createElement('ul', ns.html, [
    {
      name: 'class',
      value: `${classNames.deckList} ${classNames.listPlain}`,
    },
  ]);

  opts.medias
    .map(media => makeMediaNode(media.size, media))
    .map(node => wrap(node, listNode));

  tree.appendChild(deckNode, listNode);
  return deckNode;
}


// Render a gallery block.
function makeGalleryNode(options) {
  // Wrap a media node into a list item.
  const wrap = (mediaNode, parentNode) => {
    const listItemNode = tree.createElement('li', ns.html, [
      {
        name: 'class',
        value: classNames.galleryItem,
      },
    ]);

    tree.appendChild(listItemNode, mediaNode);
    tree.appendChild(parentNode, listItemNode);
    return listItemNode;
  };

  // Compute the flex styles.
  const computeFlex = (node, size, rowHeight) => {
    const basis = `${size[0] * rowHeight / size[1] / 16}rem`;
    const grow = `${size[0] * 100.0 / size[1]}`;
    mergeNodeAttr(node, 'style', `flex-basis: ${basis}; flex-grow: ${grow};`);
    return node;
  };

  const opts = Object.assign({}, DEFAULT_OPTIONS.gallery, options);
  const galleryNode = tree.createElement('div', ns.html, [
    {
      name: 'class',
      value: classNames.gallery,
    }
  ]);
  if (opts.alignToPage !== true) {
    setNodeAttr(galleryNode, dataAttrNames.noPageAlign, '');
  }
  if (opts.width !== undefined) {
    mergeNodeAttr(galleryNode, 'style', `width: ${opts.width}`);
  }

  const listNode = tree.createElement('ul', ns.html, [
    {
      name: 'class',
      value: `${classNames.galleryList} ${classNames.listPlain}`,
    },
  ]);

  opts.medias
    .map(media => ({ media, node: makeMediaNode(media.size, media) }))
    .map(({ media, node }) => ({ media, node: wrap(node, listNode) }))
    .map(({ media, node }) => computeFlex(node, media.size, opts.rowHeight));

  tree.appendChild(galleryNode, listNode);
  return galleryNode;
}


// Converts an element into an anchor.
function toAnchorNode(node, id) {
  setNodeAttr(node, 'id', id);
  mergeNodeAttr(node, 'class', classNames.anchor);

  const linkNode = tree.createElement('a', ns.html, [
    {
      name: 'class',
      value: classNames.anchorLink,
    },
    {
      name: 'href',
      value: `#${id}`,
    },
    {
      name: 'aria-hidden',
      value: 'true',
    },
  ]);

  const iconNode = tree.createElement('span', ns.html, [
    {
      name: 'class',
      value: classNames.anchorIcon,
    },
  ]);

  tree.appendChild(node, linkNode);
  tree.appendChild(linkNode, iconNode);
}


module.exports = {
  toHTML,
  wrapNode,
  wrapNodesBefore,
  makeFootnotesNode,
  makeMediaNode,
  makeDeckNode,
  makeGalleryNode,
  toAnchorNode,
};
