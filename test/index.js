var chai = require('chai');
var path = require('path');
var rollup = require('rollup');
var rootImport = require('..');

chai.config.includeStack = true;
var expect = chai.expect;

function after(n, cb) {
  var done = false;
  return function(err) {
    if (!err && --n) return;
    done = true;
    cb(err || null);
  };
}

function runRollup(entry, options) {
  return rollup.rollup({
    entry,
    plugins: [
      rootImport(options)
    ],
    onwarn() {}
  }).then((bundle) => {
    return bundle.generate({
      format: 'cjs'
    }).code;
  });
}

function runModule(code) {
  var module = {};
  function require(module) {
    var err = new Error('module was not resolved');
    err.module = path.resolve(__dirname, module);
    throw err;
  }

  const fn = new Function('expect', 'module', 'require', code);
  fn(expect, module, require);
  return module.exports;
}

function run(entry, options, done) {
  var entryPath = entry[0] === '/' ? entry : path.resolve(__dirname, entry);
  runRollup(entryPath, options).then((code) => {
    var value;
    try {
      value = runModule(code);
    } catch (err) {
      setImmediate(() => done(err));
      return;
    }
    setImmediate(() => done(null, value));
  }).catch((err) => setImmediate(() => done(err)));
}

describe('rollup-plugin-root-import', function() {
  this.timeout(500);

  it('should import from root', function(done) {
    run('fixtures/basic/main.js', null, done);
  });

  it('should import from root', function(done) {
    run('fixtures/basic/main.js', {
      root: path.join(__dirname, 'fixtures/basic')
    }, done);
  });

  it('should not import from a bad location', function(done) {
    run('fixtures/basic/main.js', {
      root: path.join(__dirname, 'doesnotexist')
    }, (err) => {
      expect(err).to.be.an('error');
      done();
    });
  });

  it('should not import without extension', function(done) {
    run('fixtures/extension/main.js', null, (err) => {
      expect(err).to.be.an('error');
      done();
    });
  });

  it('should try roots in order', function(done) {
    var next = after(2, done);

    run('fixtures/basic/main-root.js', {
      root: [path.join(__dirname, 'fixtures/basic'), path.join(__dirname, 'fixtures/basic/dir')]
    }, (err, value) => {
      if (err) next(err);
      else {
        expect(value).to.equal('wrong file!');
        next();
      }
    });

    run('fixtures/basic/main-root.js', {
      root: [path.join(__dirname, 'fixtures/basic/dir'), path.join(__dirname, 'fixtures/basic')]
    }, (err, value) => {
      if (err) next(err);
      else {
        expect(value).to.equal('sample');
        next();
      }
    });
  });

  it('should prepend the entry root', function(done) {
    var next = after(2, done);

    run('fixtures/basic/main-root.js', {
      useEntry: 'prepend',
      root: path.join(__dirname, 'fixtures/basic/dir')
    }, (err, value) => {
      if (err) next(err);
      else {
        expect(value).to.equal('wrong file!');
        next();
      }
    });

    run('fixtures/basic/main-hidden.js', {
      useEntry: 'prepend',
      root: path.join(__dirname, 'fixtures/basic/dir')
    }, next);
  });

  it('should append the entry root', function(done) {
    var next = after(2, done);

    run('fixtures/basic/main-root.js', {
      useEntry: 'append',
      root: path.join(__dirname, 'fixtures/basic/dir')
    }, (err, value) => {
      if (err) next(err);
      else {
        expect(value).to.equal('sample');
        next();
      }
    });

    run('fixtures/basic/main-hidden.js', {
      useEntry: 'append',
      root: path.join(__dirname, 'fixtures/basic/dir')
    }, next);
  });

  it('should import with extension', function(done) {
    run('fixtures/extension/main.js', {
      extensions: '.js'
    }, (err, value) => {
      if (err) done(err);
      else {
        expect(value).to.equal('no-extra');
        done();
      }
    });
  });

  it('should try extensions in order', function(done) {
    run('fixtures/extension/main.js', {
      extensions: ['.js', '.js.js']
    }, (err, value) => {
      if (err) done(err);
      else {
        expect(value).to.equal('no-extra');
        done();
      }
    });
  });

  it('should try extensions in order', function(done) {
    run('fixtures/extension/main.js', {
      extensions: ['.js.js', '.js']
    }, (err, value) => {
      if (err) done(err);
      else {
        expect(value).to.equal('extra');
        done();
      }
    });
  });
});
