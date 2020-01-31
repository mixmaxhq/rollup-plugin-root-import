module.exports = (api) => ({
  plugins: api.env('test') ? ['@babel/plugin-transform-modules-commonjs'] : [],
});
