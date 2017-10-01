const async = require('async');

const { toHTML, makeFootnotesNode } = require('../html');


// Process a single file.
function processFile() {
  return (file, callback) => {
    if (file.meta.footnotes.length === 0) {
      async.nextTick(callback, null, file);
      return;
    }

    const footNodesNode = makeFootnotesNode(file.meta.footnotes);
    const content = `${file.meta.content}${toHTML(footNodesNode)}`;
    const meta = Object.assign({}, file.meta, { content });
    async.nextTick(callback, null, Object.assign({}, file, { meta }));
  };
}


// Insert any footnote at the end of the content.
module.exports = () => {
  return (files, callback) => {
    async.map(
      files,
      processFile(),
      (error, results) => async.nextTick(callback, error, results)
    );
  };
};
