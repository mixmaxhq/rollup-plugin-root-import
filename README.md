rollup-plugin-root-import
=========================

Add the ability to import modules by the root path, like [babel-root-slash-import](https://github.com/mantrajs/babel-root-slash-import).

[![Build Status](https://travis-ci.org/mixmaxhq/rollup-plugin-root-import.svg?branch=master)](https://travis-ci.org/mixmaxhq/rollup-plugin-root-import)

```js
// import a module relative to a specified root directory
import UserModel from '/models/user';

// illustrative - if we were in /views/user, we can reference a model's module
// using an absolute path from the root of the project, rather than relative to
// the current module
class UserView {
  // ...
}
```

Install
-------

```sh
$ yarn add rollup-plugin-root-import
```
or
```sh
$ npm install --save-dev rollup-plugin-root-import
```

Usage
-----

```js
import {rollup} from 'rollup';
import rootImport from 'rollup-plugin-root-import';

rollup({
  entry: 'client/src/main.js',
  plugins: [
    rootImport({
      // Will first look in `client/src/*` and then `common/src/*`.
      root: `${__dirname}/common/src`,
      useEntry: 'prepend',

      // If we don't find the file verbatim, try adding these extensions
      extensions: '.js'
    })
  ]
});
```

API
---

### rootImport([options])

Creates a rollup plugin to resolve absolute-pathed imports relative to the project's entry or
specified root directory/ies.

Options:

- `root` an optional string or ordered array of strings, which represent the roots from which to try
  and resolve imports. You should specify absolute paths (i.e. using `__dirname`) in order for
  downstream Rollup plugins to match module IDs.
- `useEntry` if provided, should be either `'prepend'` or `'append'`, where each signify that the
  directory containing the entry should be prepended or appended to the array of roots,
  respectively. By default, if `root` is provided and `useEntry` is not provided, the directory of
  the `entry` module will not be used to resolve absolute-pathed imports.
- `extensions`, if provided, specifies a string or ordered array of strings, each of which
  represents an extension to append to the resolved file if the import isn't found verbatim.

License
-------

> The MIT License (MIT)
>
> Copyright &copy; 2016 Mixmax, Inc ([mixmax.com](https://mixmax.com))
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in allcopies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
