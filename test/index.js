var chai = require('chai');
var sinon = require('sinon');
var path = require('path');
var rollup = require('rollup');
var rewire = require('rewire');

var rootImport = rewire('..');

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

  var oldResolve, resolve;

  before(function() {
    oldResolve = rootImport.__get__('resolve');
    resolve = sinon.spy(oldResolve);
    rootImport.__set__('resolve', resolve);
  });

  afterEach(function() {
    resolve.reset();
  });

  after(function() {
    rootImport.__set__('resolve', oldResolve);
  });

  it('should import from root', function(done) {
    run('fixtures/basic/main.js', null, done);
  });

  it('should import from root', function(done) {
    run('fixtures/basic/main.js', {
      root: path.join(__dirname, 'fixtures/basic')
    }, done);
  });

  it('should resolve entry using root', function(done) {
    run('/main', {
      root: path.join(__dirname, 'fixtures/basic'),
      extensions: '.js'
    }, done);
  });

  it('should still resolve absolutely', function(done) {
    run(path.join(__dirname, 'fixtures/flat/main.js'), null, (err, value) => {
      expect(value).to.equal('no imports');
      done();
    });
  });

  it('should not try to import relative to itself', function(done) {
    run('/main.js', null, (err) => {
      // We're depending reasonable, yet implicit, behavior: we expect rollup to
      // fail on a missing entry.
      expect(err).to.be.an('error');
      expect(err).to.have.property('message');
      expect(err.message).to.match(/^Could not (?:load|resolve)/);
      done();
    });
  });

  it('should not import from a bad location', function(done) {
    run('fixtures/basic/main.js', {
      root: path.join(__dirname, 'doesnotexist')
    }, (err) => {
      // Since it doesn't exist, rollup will generate a require call to try and
      // load the module at runtime. Our require implementation throws an error
      // and we'll check for that here.
      expect(err).to.be.an('error');
      expect(err).to.have.property('message', 'module was not resolved');
      expect(err).to.have.property('module', '/dir/thing.js');
      done();
    });
  });

  it('should not import without extension', function(done) {
    run('fixtures/extension/main.js', null, (err) => {
      expect(err).to.be.an('error');
      expect(err).to.have.property('message', 'module was not resolved');
      expect(err).to.have.property('module', '/thing');
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

  it('should cache old imports', function(done) {
    run('/main.js', {
      root: path.join(__dirname, 'fixtures/multi')
    }, (err) => {
      if (err) done(err);
      else {
        expect(resolve.callCount).to.equal(3);
        done();
      }
    });
  });
});
