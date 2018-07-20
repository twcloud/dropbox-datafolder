const path = require('path');

module.exports = {
  entry: {
    "twits": path.resolve(__dirname, './src/index.js')
  },
  output: {
    filename: '[name]-lib.js',
    path: path.resolve(__dirname),
    library: "[name]",
    libraryTarget: "commonjs2"
  },
  target: 'node',
  externals: {
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil'
  }
};