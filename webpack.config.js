const path = require('path');

module.exports = {
  target: 'node', // Set the target environment to node
  mode: "production",
  entry: './src/kex.js', // Entry file of your server-side code
  output: {
    path: path.resolve(__dirname, 'dist'), // Output directory for the bundled file
    filename: 'bundle.js' // Output filename
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader', // Use Babel for transpiling if needed
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  externals: {
    'async-lock': 'commonjs async-lock',
    'portastic': 'commonjs portastic',
    'socket.io-client': 'commonjs socket.io-client',
    'unix-dgram': 'commonjs unix-dgram',
    'validator': 'commonjs validator'
  }
};
