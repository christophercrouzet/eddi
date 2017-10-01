const fs = require('fs');
const url = require('url');

const async = require('async');

const { tree } = require('./common');


const WEEK_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const NODE_URI_ATTRS = {
  a: ['href'],
  area: ['href'],
  audio: ['src'],
  iframe: ['src'],
  input: ['formaction', 'src'],
  img: ['src', 'srcset'],
  link: ['href'],
  script: ['src'],
  source: ['src', 'srcset'],
  video: ['poster', 'src'],
};


// Pass-through function.
function pass(e) {
  return e;
}


// Default callback to run upon completion of an async function.
function defaultCallback(error) {
  if (error) {
    console.error(error);
  }
}


// Check if a directory exists.
function dirExistsSync(filePath) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch (error) {
    return false;
  }
}


// Replace a property from its dotted path.
function replace(obj, dottedPath, fn) {
  const parts = dottedPath.split('.');

  const recurse = (o, level) => {
    if (Array.isArray(o)) {
      return o.map(v => recurse(v, level));
    }

    if (level === parts.length) {
      return fn(o);
    }

    const field = parts[level];
    const value = o[field];
    if (value === undefined) {
      throw new Error('Invalid path');
    }

    return Object.assign({}, o, { [field]: recurse(value, level + 1) });
  };

  try {
    return recurse(obj, 0);
  } catch (error) {
    return obj;
  }
}


// Fill a number with leading zeroes.
function zfill(number, width) {
  const n = number.toString();
  const zeroes = '0'.repeat(Math.max(0, width - n.length));
  return `${zeroes}${n}`;
}


// Retrieve the category described by a metadata.
function getCategory(meta) {
  return meta.category === undefined
    ? undefined
    : meta.category.id;
}


// Retrieve the date of the latest updated entry.
function getLatestUpdate(metas, dateNames) {
  // Compare two entries by their date updated.
  const compare = (a, b) => {
    return b[dateNames.updated].obj - a[dateNames.updated].obj;
  };

  if (metas.length === 0) {
    return null;
  }

  const latest = metas
    .filter(meta => meta[dateNames.updated] !== undefined)
    .sort((a, b) => compare(a, b))[0];
  return latest[dateNames.updated];
}


// Retrieve the width of a media element.
function getMediaWidth(size, styles, fullWidth) {
  if (fullWidth === true) {
    return '100%';
  }

  const idx = styles.findIndex(style => style.name === 'width');
  if (idx !== -1) {
    return styles[idx].value;
  }

  return `${size[0] / 16}rem`;
}


// Map a function to a group structure.
function mapGroup(data, fn, callback) {
  async.reduce(
    Object.entries(data),
    {},
    (obj, [groupName, group], cb) => {
      async.map(group, fn, (error, results) => {
        if (error) {
          async.nextTick(cb, error);
          return;
        }

        Object.assign(obj, { [groupName]: results });
        async.nextTick(cb, null, obj);
      });
    },
    (error, result) => {
      async.nextTick(callback, error, result);
    }
  );
}


// Synchronous version of the 'mapGroup' function.
function mapGroupSync(data, fn) {
  return Object.entries(data)
    .reduce((obj, [groupName, group]) => {
      return Object.assign(obj, { [groupName]: group.map(fn) });
    }, {});
}


// Parse a date.
function parseDate(dateString) {
  // Retrieve the ordinal indicator for a given day.
  const getOrdinalIndicator = (day) => {
    if (day === 1 || day === 21 || day === 31) {
      return 'st';
    } else if (day === 2 || day === 22) {
      return 'nd';
    } else if (day === 3 || day === 23) {
      return 'rd';
    }

    return 'th';
  };

  const raw = dateString;
  const obj = new Date(raw);
  if (isNaN(obj)) {
    return { raw };
  }

  const day = obj.getDate();
  const month = obj.getMonth() + 1;
  const year = obj.getFullYear();
  const hours = obj.getHours();
  const minutes = obj.getMinutes();
  const seconds = obj.getSeconds();
  const weekdayName = WEEK_DAYS[obj.getDay()];
  const monthName = MONTHS[obj.getMonth()];
  const shortWeekdayName = weekdayName.slice(0, 3);
  const shortMonthName = monthName.slice(0, 3);
  const dayOrdinalIndicator = getOrdinalIndicator(day);
  const date = `${year}-${zfill(month, 2)}-${zfill(day, 2)}`;
  const time = `${zfill(hours, 2)}:${zfill(minutes, 2)}:${zfill(seconds, 2)}`;
  const dateTime = `${date}T${time}Z`;
  const pretty = `${day} ${monthName} ${year}`;
  return {
    day,
    month,
    year,
    hours,
    minutes,
    seconds,
    weekdayName,
    monthName,
    shortWeekdayName,
    shortMonthName,
    dayOrdinalIndicator,
    date,
    time,
    dateTime,
    pretty,
    obj,
    raw,
  };
}


// Iterate through a node tree in depth-first search order.
// The function 'fn' takes multiple parameters:
// - node: current node being iterated.
// - ...args: matching 'initialArgs' and the values passed when calling 'next'
//            from the parent node.
// - next: callback to call to move onto the next node.
function walkTree(rootNode, fn, initialArgs = [], callback = defaultCallback) {
  const stack = [{ node: rootNode, args: initialArgs }];

  // Callback to pass to the function to iterate to the next node.
  const next = (error, node, ...args) => {
    if (error) {
      async.nextTick(callback, error, ...args);
      return;
    }

    if (node !== undefined) {
      const children = tree.getChildNodes(node);
      if (children !== undefined) {
        stack.unshift(...children.map((child) => {
          return { node: child, args };
        }));
      }
    }

    advance(args);
  };

  // Iterate to the next node.
  const advance = (previousArgs) => {
    if (stack.length === 0) {
      async.nextTick(callback, null, ...previousArgs);
      return;
    }

    const { node, args } = stack.shift();
    fn(node, ...args, next);
  };

  advance([]);
}


// Synchronous version of the 'walkTree' function.
function walkTreeSync(rootNode, fn, initialArgs = []) {
  let result;
  const stack = [{ node: rootNode, args: initialArgs }];
  while (stack.length) {
    const { node, args } = stack.shift();
    result = Object.assign({}, { node, args }, fn(node, ...args));
    if (result.node !== undefined) {
      const children = tree.getChildNodes(result.node);
      if (children !== undefined) {
        stack.unshift(...children.map((child) => {
          return { node: child, args: result.args };
        }));
      }
    }
  }

  return result === undefined ? [] : result.args;
}


// Retrieve an element node attribute from its name.
function getNodeAttr(node, name) {
  const attrs = tree.getAttrList(node);
  if (attrs === undefined) {
    return;
  }

  return attrs.find(attr => attr.name === name);
}


// Retrieve element node attributes as a map.
function getNodeAttrMap(node, filter = pass) {
  return tree.getAttrList(node)
    .filter(attr => filter(attr))
    .reduce((obj, attr) => {
      return Object.assign(obj, { [attr.name]: attr.value });
    }, {});
}


// Retrieve any element node URI attributes.
function getNodeURIAttrs(node) {
  const attrNames = NODE_URI_ATTRS[tree.getTagName(node)];
  if (attrNames === undefined) {
    return [];
  }

  return attrNames
    .map(attrName => getNodeAttr(node, attrName))
    .filter(attr => attr !== undefined);
}


// Set an element node attribute.
function setNodeAttr(node, name, value) {
  const attrs = tree.getAttrList(node);
  const index = attrs.findIndex(attr => attr.name === name);
  if (index === -1) {
    attrs.push({ name, value });
  } else {
    attrs.splice(index, 1, { name, value });
  }
}


// Remove an element node attribute.
function delNodeAttr(node, name) {
  const attrs = tree.getAttrList(node);
  const index = attrs.findIndex(attr => attr.name === name);
  if (index !== -1) {
    attrs.splice(index, 1);
  }
}


// Merge an attribute into an element node.
function mergeNodeAttr(node, name, value) {
  const attrs = tree.getAttrList(node);
  const index = attrs.findIndex(attr => attr.name === name);
  if (index === -1) {
    attrs.push({ name, value });
  } else {
    attrs.splice(index, 1, { name, value: `${attrs[index].value} ${value}` });
  }
}


// Retrieve all the space separated values of an element node attribute.
function splitNodeAttrValues(node, name) {
  const attr = getNodeAttr(node, name);
  if (attr === undefined) {
    return [];
  }

  return attr.value.split(/\s+/);
}


// Join the content of all the text nodes nested under a given node.
function joinTextNodeContents(rootNode) {
  const texts = [];
  walkTreeSync(rootNode, (node) => {
    if (tree.isTextNode(node)) {
      texts.push(tree.getTextNodeContent(node));
    }
  });
  return texts.join('');
}


// Join two parts of an URI.
function joinURI(a, b) {
  return a.endsWith('/')
    ? url.resolve(a, b)
    : url.resolve(`${a}/`, b);
}


// Resolve a local URI pointing to an existing file.
function resolveLocalURI(uri, files) {
  const urlObj = url.parse(uri);
  const hash = urlObj.hash === null ? '' : urlObj.hash;
  const uriPath = uri.slice(0, uri.length - hash.length);
  const file = files.find((f) => {
    return (
      f.meta.url === uriPath
      || (f.meta.url.raw !== undefined && f.meta.url.raw === uriPath)
    );
  });
  if (file === undefined) {
    return uri;
  }

  const { filePath } = file.meta;
  return joinURI(uriPath, `${filePath.name}${filePath.ext}${hash}`);
}


// Resolve a relative URI.
const resolveRelativeURI = (uri, meta) => {
  let out = uri;
  if (uri.startsWith('/')) {
    out = joinURI(meta.baseURL, `.${uri}`);
  } else if (uri.startsWith('./')) {
    out = joinURI(meta.baseURL, `.${meta.url}/${uri}`);
  } else {
    return out;
  }

  if (out !== '/' && out.endsWith('/')) {
    out = out.slice(0, -1);
  }

  return out;
};


// Resolve an URI into a fully defined one.
function resolveFullURI(uri, meta, files) {
  let out = uri;
  if (meta.baseURL.startsWith('file:')) {
    out = resolveLocalURI(out, files);
  }

  out = resolveRelativeURI(out, meta);
  return out;
}


// Parse an URI.
function parseURI(uri, meta, files) {
  const full = resolveFullURI(uri, meta, files);

  let short = '';
  if (full === meta.baseURL) {
    short = '/';
  } else if (full.startsWith(meta.baseURL)) {
    short = full.slice(meta.baseURL.length);
  }

  return { full, short, raw: uri };
}


module.exports = {
  defaultCallback,
  dirExistsSync,
  replace,
  zfill,
  getCategory,
  getLatestUpdate,
  getMediaWidth,
  mapGroup,
  mapGroupSync,
  parseDate,
  walkTree,
  walkTreeSync,
  getNodeAttr,
  getNodeAttrMap,
  getNodeURIAttrs,
  setNodeAttr,
  delNodeAttr,
  mergeNodeAttr,
  splitNodeAttrValues,
  joinTextNodeContents,
  joinURI,
  resolveLocalURI,
  resolveRelativeURI,
  resolveFullURI,
  parseURI,
};
