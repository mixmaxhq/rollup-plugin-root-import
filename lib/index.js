var fs = require('fs');
var path = require('path');

/**
 * Check whether the given value is a string.
 *
 * @param {*} value
 * @return {boolean} Whether value is a string.
 */
const isString = (value) => typeof value === 'string';

/**
 * Coerce the input to an array of strings. If the input is a string, wrap it in
 * an array. If the input is a string, filter out all the non-string elements.
 * If we end up with an empty array, return null.
 *
 * @param {*} array
 * @return {?Array<String>} The output array.
 */
function strArray(array) {
  if (Array.isArray(array)) {
    array = array.filter(isString);
    return array.length ? array : null;
  }
  return isString(array) ? [array] : null;
}

/**
 * Call the evaluate function asynchronously on each item in the items array,
 * and return a promise that will fail on the first error evaluate produces, or
 * resolve to the first truthy value which evaluate produces. If all items
 * evaluate to falsy values, and evaluate never produces an error, the promise
 * will resolve to null.
 *
 * @param {Array<*>} items An array of opaque items.
 * @param {Function(*, Function(?Error=, *=))} evaluate
 * @return {Promise<*>}
 */
function firstOf(items, evaluate) {
  return new Promise((accept, reject) => {
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
}

/**
 * Asynchronously resolve a module to an absolute path given a set of places to
 * look.
 *
 * @param {String} importee The id of the module, relative to one of the
 *   specified imports.
 * @param {Array<Import>} imports The import objects.
 * @return {Promise<?String>} The resolved module.
 */
function resolve(importee, imports) {
  return firstOf(imports, ({root, extension}, done) => {
    const file = path.join(root, importee + extension);
    fs.stat(file, (err, stats) => {
      if (!err && stats.isFile()) done(null, file);
      else done(null, null);
    });
  });
}

class Import {
  constructor(root, extension) {
    this.root = root;
    this.extension = extension;
  }
}

/**
 * Add the ability to import modules by the root path, like Meteor.
 *
 * @param {{
 *   useEntry: boolean=,
 *   root: string|Array<string>=,
 *   extensions: string|Array<string>=
 * }} options The options for this rollup plugin.
 * @return {Object} The rollup plugin.
 */
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

  // We can cache resolved modules when they're relative to the root. We use a
  // null-inherited to avoid needing to use hasOwnProperty.
  const cache = Object.create(null);

  const imports = [], hadNoRoots = !roots;
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

    resolveId(importee, importer) {
      // Don't try to resolve the entry unless we have explicit roots.
      if (!importer && hadNoRoots) return;

      if (importee[0] === '/') {
        // If we've cached this import, don't bother trawling the filesystem
        // again.
        const cached = cache[importee];
        if (cached) return cached;

        return resolve(importee, imports).then((resolved) => {
          // Save this in the cache in case we see it again.
          cache[importee] = resolved;
          return resolved;
        });
      }
    }
  };
}
