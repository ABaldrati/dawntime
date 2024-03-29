const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = (env, argv) => {
    const devMode = argv.mode !== "production";

    return ({
        entry: './src/index.ts',
        output: {
            path: path.resolve(__dirname, process.env.WEBPACK_PUBLIC_PATH || 'dist'),
            filename: 'bundle.js'
        },
        module: {
            rules: [
                {
                    test: /\.ts(x)?$/,
                    loader: 'ts-loader',
                    exclude: /node_modules/
                },
                {
                    test: /\.css$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        'css-loader'
                    ]
                },
                {
                    test: /\.scss$/,
                    use: [
                        devMode ? 'style-loader' : MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader'
                        },
                        {
                            loader: 'sass-loader'
                        }
                    ]
                },
                {
                    test: /\.glsl$/,
                    use: 'raw-loader'
                },
                {
                    test: /\.gltf$/,
                    loader: 'gltf-webpack-loader',
                },
                {
                    test: /\.(\d+|png|jpg|jpeg|bin)/,
                    loader: 'file-loader',
                },
                {
                    test: /\.json$/,
                    loader: 'file-loader',
                    type: 'javascript/auto'
                },
            ]
        },
        devtool: devMode ? 'inline-source-map' : false,
        devServer: {
            contentBase: './dist',
            hot: true,
        },
        resolve: {
            extensions: [
                '.tsx',
                '.ts',
                '.js'
            ]
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: "./web/index.html",
            }),
            new FaviconsWebpackPlugin( {
                logo: './web/logo_icon.png',
                mode: "light"
            }),
            new MiniCssExtractPlugin(),
            new BundleAnalyzerPlugin({
                analyzerMode: 'static',
                openAnalyzer: false,
            })
        ]
    });
};
