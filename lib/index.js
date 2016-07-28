var fs = require('fs');
var path = require('path');

const isString = (string) => typeof string === 'string';
const strArray = (array) => {
  if (Array.isArray(array)) {
    array = array.filter(isString);
    return array.length ? array : null;
  }
  return isString(array) ? [array] : null;
};

function firstOf(items, evaluate) {
  const promise = new Promise((accept, reject) => {
    (function next(i) {
      if (i >= items.length) {
        accept(null);
        return;
      }

      setImmediate(() => evaluate(items[i], (err, value) => {
        if (err) reject(err);
        else if (value) accept(value);
        else next(i + 1);
      }));
    })(0);
  });

  return promise;
}

class Import {
  constructor(root, extension) {
    this.root = root;
    this.extension = extension;
  }
}

export default function rootImport(options) {
  let useEntry = false, extensions = null;
  let roots = strArray(options);
  if (!roots && options && typeof options === 'object') {
    roots = strArray(options.root);
    extensions = strArray(options.extensions);

    if (~['prepend', 'append'].indexOf(options.useEntry)) {
      useEntry = options.useEntry;
    }
  }

  if (!extensions) extensions = [''];
  else if (extensions.indexOf('') === -1) extensions.unshift('');

  const imports = [];
  return {
    options({entry}) {
      const entryRoot = path.dirname(entry);

      if (!roots) {
        roots = [entryRoot];
      } else if (useEntry === 'prepend') {
        roots.unshift(entryRoot);
      } else if (useEntry === 'append') {
        roots.push(entryRoot);
      }

      for (let root of roots) {
        for (let ext of extensions) {
          imports.push(new Import(root, ext));
        }
      }
    },

    resolveId(importee) {
      if (importee[0] === '/') {
        return firstOf(imports, ({root, extension}, done) => {
          const file = path.join(root, importee + extension);
          fs.stat(file, (err, stats) => {
            if (!err && stats.isFile()) done(null, file);
            else done(null, null);
          });
        });
      }
    }
  };
};
