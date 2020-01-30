import fs from 'fs';
import path from 'path';
import { rollup } from 'rollup';
import multiEntry from 'rollup-plugin-multi-entry';

import rootImport from './';

const fixtures = path.resolve(__dirname, '../test/support/fixtures');

jest.mock('fs', () => {
  const fs = jest.requireActual('fs');
  jest.spyOn(fs, 'stat');
  return fs;
});

function runRollup(input, { plugins = [], ...options } = {}) {
  return rollup({
    input,
    plugins: [rootImport(options), ...plugins],
    onwarn() {},
  }).then(async (bundle) => {
    const { output } = await bundle.generate({
      format: 'cjs',
    });
    expect(output).toHaveLength(1);
    return output[0].code;
  });
}

function runModule(code) {
  const module = {};
  function require(module) {
    const err = new Error('module was not resolved');
    err.module = path.resolve(fixtures, module);
    throw err;
  }

  const fn = new Function('expect', 'module', 'require', code);
  fn(expect, module, require);
  return module.exports;
}

async function run(input, options) {
  if (typeof input === 'string') {
    input = input[0] === '/' ? input : path.resolve(fixtures, input);
  }
  return runRollup(input, options).then((code) => runModule(code));
}

async function expectRejects(promise, fn) {
  await expect(promise).rejects.toThrow();
  fn(await promise.catch((err) => err));
}

describe('rollup-plugin-root-import', function() {
  // This fixture contains its own expectation.
  it('should import from root', () => run('basic/main.js'));

  it('should not choke on exotic entries', () =>
    run(['basic/main.js'], {
      plugins: [multiEntry()],
    }));

  it('should import from specified root', () =>
    run('basic/main.js', {
      root: `${fixtures}/basic`,
    }));

  it('should resolve entry using root', () =>
    run('/main', {
      root: `${fixtures}/basic`,
      extensions: '.js',
    }));

  it('should still resolve absolutely', async () => {
    await expect(run(`${fixtures}/flat/main.js`)).resolves.toBe('no imports');
  });

  it('should not try to import relative to itself', async () => {
    // We're depending reasonable, yet implicit, behavior: we expect rollup to fail on a missing
    // entry.
    await expect(run('/main.js')).rejects.toThrow(/^Could not (?:load|resolve)/);
  });

  it('should not import from a bad location', () =>
    expectRejects(
      run('basic/main.js', {
        root: `${fixtures}/doesnotexist`,
      }),
      (err) => {
        // Since it doesn't exist, rollup will generate a require call to try and
        // load the module at runtime. Our require implementation throws an error
        // and we'll check for that here.
        expect(err).toBeInstanceOf(Error);
        expect(err).toHaveProperty('message', 'module was not resolved');
        expect(err).toHaveProperty('module', '/dir/thing.js');
      }
    ));

  it('should not import without extension', () =>
    expectRejects(run('extension/main.js'), (err) => {
      expect(err).toBeInstanceOf(Error);
      expect(err).toHaveProperty('message', 'module was not resolved');
      expect(err).toHaveProperty('module', '/thing');
    }));

  it('should try roots in order', () =>
    Promise.all([
      expect(
        run('basic/main-root.js', {
          root: [`${fixtures}/basic`, `${fixtures}/basic/dir`],
        })
      ).resolves.toBe('wrong file!'),

      expect(
        run('basic/main-root.js', {
          root: [`${fixtures}/basic/dir`, `${fixtures}/basic`],
        })
      ).resolves.toBe('sample'),
    ]));

  it('should prepend the entry root', () =>
    Promise.all([
      expect(
        run('basic/main-root.js', {
          useInput: 'prepend',
          root: `${fixtures}/basic/dir`,
        })
      ).resolves.toBe('wrong file!'),

      // This fixture contains its own expectation.
      run('basic/main-hidden.js', {
        useInput: 'prepend',
        root: `${fixtures}/basic/dir`,
      }),
    ]));

  it('should append the entry root', () =>
    Promise.all([
      expect(
        run('basic/main-root.js', {
          useInput: 'append',
          root: `${fixtures}/basic/dir`,
        })
      ).resolves.toBe('sample'),

      // This fixture contains its own expectation.
      run('basic/main-hidden.js', {
        useInput: 'append',
        root: `${fixtures}/basic/dir`,
      }),
    ]));

  it('should import with extension', () =>
    expect(
      run('extension/main.js', {
        extensions: '.js',
      })
    ).resolves.toBe('no-extra'));

  it('should try extensions in order', () =>
    expect(
      run('extension/main.js', {
        extensions: ['.js', '.js.js'],
      })
    ).resolves.toBe('no-extra'));

  it('should try extensions in order', () =>
    expect(
      run('extension/main.js', {
        extensions: ['.js.js', '.js'],
      })
    ).resolves.toBe('extra'));

  it('should cache old imports', async () => {
    await run('/main.js', {
      root: `${fixtures}/multi`,
    });

    expect(fs.stat).toHaveBeenCalledTimes(3);
  });
});
