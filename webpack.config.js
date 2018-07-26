const path = require('path');

module.exports = {
  mode: "development",
  watch: true,
  entry: {
    "twits": path.resolve(__dirname, './src/index.js')
  },
  resolve:{
    alias: {
      dropbox: path.join(__dirname, 'node_modules/dropbox/dist/Dropbox-sdk.min.js'),
      // path: path.join(__dirname, "node_modules/path"),
      // buffer: path.join(__dirname, "node_modules/buffer"),
      // "rxjs/operators": path.join(__dirname, "node_modules/rxjs/bundles/rxjs.umd.min.js"),
      // rxjs: path.join(__dirname, "node_modules/rxjs/bundles/rxjs.umd.min.js"),
    }
  },
  output: {
    filename: '[name]-lib.js',
    path: path.resolve(__dirname),
    library: "[name]",
    libraryTarget: "var"
  },
  // target: '',
  externals: {
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil'
  }
};