import babel from 'rollup-plugin-babel';

var pkg = require('./package.json');

export default {
  entry: 'lib/index.js',
  plugins: [
    babel({
      presets: [
        [
          'es2015',
          {
            modules: false
          }
        ]
      ],
      plugins: [
        'external-helpers'
      ]
    })
  ],
  targets: [
    {
      format: 'cjs',
      dest: pkg['main']
    },
    {
      format: 'es',
      dest: pkg['jsnext:main']
    }
  ]
};
