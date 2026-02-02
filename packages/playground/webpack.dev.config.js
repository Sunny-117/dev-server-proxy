const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { webpackDevServerProxy } = require('dev-server-proxy');
const config = require('./config');

module.exports = {
    mode: 'development',
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
        clean: true
    },
    devServer: {
        ...webpackDevServerProxy(config, 5),
        port: 3001,
        hot: true,
        historyApiFallback: true
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
            title: 'Webpack Proxy Playground'
        })
    ]
};
