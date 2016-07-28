var expect = require('chai').expect;
var path = require('path');
var rollup = require('rollup');
var rootImport = require('..');

function after(n, cb) {
  var done = false;
  return function(err) {
    if (!err && --n) return;
    done = true;
    cb(err || null);
  };
}

function run(entry, options, done) {
  rollup.rollup({
    entry: path.resolve(__dirname, entry),
    plugins: [
      rootImport(options)
    ],
    onwarn() {}
  }).then((bundle) => {
    const code = bundle.generate({
      format: 'cjs'
    }).code;
    var module = {};
    try {
      const fn = new Function('expect', 'module', code);
      value = fn(expect, module);
    } catch (err) {
      setImmediate(() => done(err));
      return;
    }
    setImmediate(() => done(null, module.exports));
  });
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
