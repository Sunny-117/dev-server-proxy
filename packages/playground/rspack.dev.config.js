const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { webpackDevServerProxy } = require('dev-server-proxy');
const config = require('./config');

// Get proxy configuration from dev-server-proxy
const proxyConfig = webpackDevServerProxy(config, 5);

// Extract only the properties that rspack devServer supports
// Note: rspack uses 'server' instead of 'https'
const { setupMiddlewares, allowedHosts, open, https } = proxyConfig;

module.exports = {
    mode: 'development',
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
        clean: true
    },
    devServer: {
        setupMiddlewares,
        allowedHosts,
        open,
        server: https ? 'https' : 'http',
        port: 3002,
        hot: true,
        historyApiFallback: true
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
            title: 'Rspack Proxy Playground'
        })
    ]
};
