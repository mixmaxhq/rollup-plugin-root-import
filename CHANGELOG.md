## [1.0.0](https://github.com/mixmaxhq/rollup-plugin-root-import/compare/v0.2.4...v1.0.0) (2020-01-31)


### ⚠ BREAKING CHANGES

* Supports Rollup 1.x, and likely does not support earlier versions. Change entry
parameter to input, and useEntry to useInput. Uses newer untranspiled language features such as
String#includes, but should otherwise retain parity with the previous version.

### Features

* support rollup 1.x ([#12](https://github.com/mixmaxhq/rollup-plugin-root-import/issues/12)) ([bf2b2f6](https://github.com/mixmaxhq/rollup-plugin-root-import/commit/bf2b2f61a8a31ed194511ecb328fbf2807e0c3bd))

## Release History

* 0.2.4 fix engines configuration per #10 (thanks, @richard-riverford!)
* 0.2.3 deyarn
