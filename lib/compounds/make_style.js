const path = require('path');

const pillr = require('pillr');

const { prependToPath } = require('../components');


const DEFAULT_OPTIONS = {
  prepend: path.join('assets', 'styles'),
};


module.exports = (destinationPath, stylesPath, options) => {
  const opts = Object.assign({}, DEFAULT_OPTIONS, options);
  const base = pillr.compounds.makeStyle;
  return base(destinationPath, stylesPath, opts)
    .insertManyBefore('sink', [
      {
        name: 'prependToPath',
        fn: prependToPath(opts.prepend),
      },
    ]);
};
