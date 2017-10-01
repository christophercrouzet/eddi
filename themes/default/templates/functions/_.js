const { toHTML, makeMediaNode } = require('../../../../lib/html');



// Render a media defined in the meta.
function renderMedia(file) {
  return () => (text, render) => {
    const meta = file.meta.medias[text];
    const node = makeMediaNode(meta.size, meta);
    return toHTML(node);
  };
}


module.exports = {
  renderMedia,
};
