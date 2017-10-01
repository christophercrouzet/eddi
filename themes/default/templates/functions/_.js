const { tree } = require('../../../../lib/common');
const { toHTML, makeMediaNode } = require('../../../../lib/html');
const {
  walkTreeSync,
  getNodeURIAttrs,
  resolveFullURI,
} = require('../../../../lib/utils');


const MEDIA_TAGS = ['img', 'video'];



// Render a media defined in the meta.
function renderMedia(file, files) {
  return () => (text, render) => {
    const meta = file.meta.medias[text];
    const mediaNode = makeMediaNode(meta.size, meta);
    walkTreeSync(mediaNode, (node) => {
      if (MEDIA_TAGS.includes(tree.getTagName(node))) {
        getNodeURIAttrs(node)
          .forEach((attr) => {
            attr.value = resolveFullURI(attr.value, file.meta, files);
          });
      }
    });

    return toHTML(mediaNode);
  };
}


module.exports = {
  renderMedia,
};
