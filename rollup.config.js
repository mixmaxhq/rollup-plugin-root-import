import babel from 'rollup-plugin-babel';
import { builtinModules } from 'module';
import pkg from './package.json';

export default {
  input: 'lib/index.js',
  external: builtinModules,
  plugins: [
    babel({
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              // The promisify export was added to the util module in 8.0.0
              node: '8.0.0',
            },
          },
        ],
      ],
    }),
  ],
  output: [
    {
      format: 'cjs',
      file: pkg.main,
    },
    {
      format: 'es',
      file: pkg.module,
    },
  ],
};
