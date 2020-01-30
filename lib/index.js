import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const fsStat = promisify(fs.stat);

/**
 * Check whether the given value is a string.
 *
 * @param {*} value
 * @return {boolean} Whether value is a string.
 */
const isString = (value) => typeof value === 'string';

/**
 * Coerce the input to an array of strings. If the input is a string, wrap it in an array. If the
 * input is a string, filter out all the non-string elements. If we end up with an empty array,
 * return null.
 *
 * @param {*} array
 * @return {?Array<String>} The output array. Not a reference to the original array.
 */
function strArray(array) {
  if (Array.isArray(array)) {
    array = array.filter(isString);
    return array.length ? array : null;
  }
  return isString(array) ? [array] : null;
}

/**
 * Call the evaluate function asynchronously on each item in the items array, and return a promise
 * that will fail on the first error evaluate produces, or resolve to the first truthy value which
 * evaluate produces. If all items evaluate to falsy values, and evaluate never produces an error,
 * the promise will resolve to null.
 *
 * @param {Array<*>} items An array of opaque items.
 * @param {Function(*, Function(?Error=, *=))} evaluate
 * @return {Promise<*>}
 */
async function firstOf(items, evaluate) {
  for (const item of items) {
    const value = await evaluate(item);
    if (value) return value;
  }
  return null;
}

/**
 * Asynchronously resolve a module to an absolute path given a set of places to look.
 *
 * @param {String} importee The id of the module, relative to one of the specified imports.
 * @param {Array<Import>} imports The import objects.
 * @return {Promise<?String>} The resolved module.
 */
function resolve(importee, imports) {
  return firstOf(imports, async ({ root: rootPath, extension }) => {
    const file = path.join(rootPath, importee + extension);
    return fsStat(file).then(
      (stats) => (stats.isFile() ? file : null),
      () => null
    );
  });
}

class Import {
  constructor(rootPath, extension) {
    this.root = rootPath;
    this.extension = extension;
  }
}

/**
 * Add the ability to import modules by the root path, like Meteor.
 *
 * @param {{
 *   useInput: boolean=,
 *   root: string|Array<string>=,
 *   extensions: string|Array<string>=
 * }} options The options for this rollup plugin.
 * @return {Object} The rollup plugin.
 */
export default function rootImport(options) {
  let useInput = false,
    extensions = null;
  let roots = strArray(options);
  if (!roots && options && typeof options === 'object') {
    roots = strArray(options.root);
    extensions = strArray(options.extensions);

    if (['prepend', 'append'].includes(options.useInput)) {
      useInput = options.useInput;
    }
  }

  if (!extensions) extensions = [''];
  else if (!extensions.includes('')) extensions.unshift('');

  // We can cache resolved modules when they're relative to the root. We use a null-inherited to
  // avoid needing to use hasOwnProperty.
  const cache = Object.create(null);

  const imports = [],
    hadNoRoots = !roots;
  return {
    options({ input }) {
      if (!roots) roots = [];

      // Ignore exotic input types (arrays, objects) as may be handled by plugins like
      // https://github.com/rollup/rollup-plugin-multi-entry.
      if (typeof input === 'string') {
        const entryRoot = path.dirname(input);

        if (!roots.length) {
          roots.push(entryRoot);
        } else if (useInput === 'prepend') {
          roots.unshift(entryRoot);
        } else if (useInput === 'append') {
          roots.push(entryRoot);
        }
      }

      for (const rootPath of roots) {
        for (const ext of extensions) {
          imports.push(new Import(rootPath, ext));
        }
      }
    },

    resolveId(importee, importer) {
      // Don't try to resolve the entry unless we have explicit roots.
      if (!importer && hadNoRoots) return null;

      if (importee[0] === '/') {
        // If we've cached this import, don't bother trawling the filesystem again.
        const cached = cache[importee];
        if (cached) return cached;

        const resolution = resolve(importee, imports);

        // Save this in the cache in case we see it again.
        cache[importee] = resolution;
        return resolution;
      }

      return null;
    },
  };
}
