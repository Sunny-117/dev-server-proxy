# Rspack Integration Test

This directory contains test configurations for both Webpack and Rspack to verify dev-server-proxy compatibility.

## Rspack Support

Rspack uses `@rspack/dev-server` which is based on webpack-dev-server, making it fully compatible with dev-server-proxy.

## Installation

```bash
pnpm install
```

## Running with Rspack

```bash
# Start with default proxy
pnpm run start:rspack

# Start with mock data
pnpm run start:rspack:mock

# Start with test environment
pnpm run start:rspack:test

# Start with online environment
pnpm run start:rspack:online
```

## Running with Webpack

```bash
# Start with default proxy
pnpm run start

# Start with mock data
pnpm run start:mock

# Start with test environment
pnpm run start:test

# Start with online environment
pnpm run start:online
```

## Configuration

Both `webpack.dev.config.js` and `rspack.dev.config.js` use the same `config.js` file and dev-server-proxy integration:

```javascript
const { webpackDevServerProxy } = require('dev-server-proxy');
const config = require('./config');

module.exports = {
    devServer: {
        ...webpackDevServerProxy(config, 5),
        // ... other devServer options
    }
};
```

## Testing

1. Start the dev server (webpack or rspack)
2. Modify `.devserverrc` to change proxy settings
3. Modify mock files in `./mock` directory
4. Changes should take effect immediately without restart
