# Dev Server Proxy [![npm](https://img.shields.io/npm/v/dev-server-proxy.svg)](https://npmjs.com/package/dev-server-proxy)

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]


[中文文档](./README.zh-CN.md)

A dynamic proxy middleware for webpack-dev-server that enables **hot-swapping proxy configurations and mock data without restarting your dev server**.

## Why Dev Server Proxy?

During frontend development, you often need to:
- Switch between local mock data and remote servers
- Test against different environments (dev, staging, production)
- Use different proxy strategies for specific APIs

Traditionally, these changes require modifying config files and restarting webpack, which:
- Slows down development (waiting for compilation)
- Interrupts your workflow
- Makes debugging across environments difficult

**Dev Server Proxy solves this** by allowing real-time configuration updates through a simple `.devserverrc` file.

## Features

- 🔥 **Hot Configuration Reload** - Update proxy rules without restarting
- 📝 **Hot Mock Updates** - Modify mock files and see changes instantly
- 🎯 **Flexible Routing** - Global proxy, custom API rules, and path-level configurations
- 🌍 **Multi-Environment Support** - Built-in support for mock, test, staging, and production
- ⚡ **Webpack 4 & 5 Compatible** - Works with both major versions
- 📦 **Rspack Support** - Seamlessly integrates with Rspack's webpack-dev-server

## Quick Start

### Installation

```bash
npm install dev-server-proxy --save-dev
# or
pnpm add dev-server-proxy -D
```

### Basic Setup

**1. Add scripts to package.json**

For Webpack < 5 (using `--proxy` flag):
```json
{
  "scripts": {
    "start": "webpack-dev-server --config webpack.dev.config.js --proxy mock",
    "start:online": "webpack-dev-server --config webpack.dev.config.js --proxy online"
  }
}
```

For Webpack >= 5 (using `PROXY` env variable):
```json
{
  "scripts": {
    "start": "PROXY=mock webpack serve --config webpack.dev.config.js",
    "start:online": "PROXY=online webpack serve --config webpack.dev.config.js"
  }
}
```

**2. Configure webpack devServer**

For Webpack:
```javascript
const devServerProxy = require('dev-server-proxy');
const config = require('./config');

module.exports = {
  devServer: {
    ...devServerProxy(config),
    // For webpack 5, pass version number:
    // ...devServerProxy(config, 5),
    historyApiFallback: true,
    port: 3000
  }
};
```

For Rspack:
```javascript
const { webpackDevServerProxy } = require('dev-server-proxy');
const config = require('./config');

const proxyConfig = webpackDevServerProxy(config, 5);
const { setupMiddlewares, allowedHosts, open, https } = proxyConfig;

module.exports = {
  devServer: {
    setupMiddlewares,
    allowedHosts,
    open,
    server: https ? 'https' : 'http',
    port: 3000,
    historyApiFallback: true
  }
};
```

**3. Create config.js**

```javascript
const path = require('path');

module.exports = {
  WORK_PATH: __dirname,
  MOCK_PATH: path.join(__dirname, './mock'),
  AJAX_API: /^\/api\/request.ajax$/,
  
  // Environment configurations
  PROXY_ONLINE: {
    host: 'dev.example.com',
    target: 'https://api.example.com',
    open: 'https://dev.example.com:3000'
  },
  PROXY_MOCK: {
    host: 'dev.example.com',
    open: 'http://dev.example.com:3000'
  }
};
```

**4. Configure hosts file**

```
127.0.0.1 dev.example.com
```

**5. Create mock files**

Create mock files in your `MOCK_PATH` directory. File names use underscores to separate path segments:

```javascript
// File: mock/user_GET_info.js
// Maps to: user/GET/info

module.exports = (params) => {
  return {
    status: 200,
    response: {
      code: 0,
      data: {
        username: 'john_doe',
        email: 'john@example.com'
      }
    }
  };
};
```

**6. Start development**

```bash
npm start
```

## Dynamic Configuration

Modify the `.devserverrc` file in your working directory to change proxy settings on the fly:

```json
{
  "PROXY": "PROXY_ONLINE",
  "PATH_RULES": {
    "user/GET/info": {
      "proxy": "PROXY_MOCK"
    },
    "product/GET/list": {
      "target": "https://staging.example.com"
    }
  }
}
```

Changes take effect immediately without restarting the dev server!

## Configuration Options

### Required Fields

- `WORK_PATH` - Working directory path
- `MOCK_PATH` - Directory containing mock files
- `AJAX_API` - Regex pattern matching your API endpoint

### Environment Configurations

Define proxy configurations for different environments:

```javascript
{
  PROXY_MOCK: {
    host: 'dev.example.com',
    open: 'http://dev.example.com:3000'
  },
  PROXY_TEST: {
    host: 'dev.example.com',
    target: 'https://test-api.example.com',
    open: 'https://dev.example.com:3000'
  },
  PROXY_ONLINE: {
    host: 'dev.example.com',
    target: 'https://api.example.com',
    open: 'https://dev.example.com:3000'
  }
}
```

### Custom API Rules

For non-standard API patterns, use `CUSTOM_API`:

```javascript
{
  CUSTOM_API: [
    {
      rule: (parsedUrl) => {
        // Custom logic to extract path from URL
        if (parsedUrl.pathname.startsWith('/custom/')) {
          return parsedUrl.pathname.replace('/custom/', '');
        }
      }
    }
  ]
}
```

## Advanced Usage

### Manual Middleware Integration

If you need more control, you can manually integrate the middleware:

```javascript
const startMockWatch = require('dev-server-proxy/src/startWatch');
const getProxyMiddleware = require('dev-server-proxy/src/core/server');
const config = require('./config');

// Start file watchers
startMockWatch(config);

// Use middleware in your Express app
app.use('/', getProxyMiddleware(config));
```

## Mock File Format

Mock files should export a function that receives request parameters and returns a response object:

```javascript
module.exports = (params) => {
  // params contains parsed request parameters
  console.log('Request params:', params);
  
  return {
    status: 200,  // HTTP status code
    response: {   // Response body
      code: 0,
      data: { /* your data */ },
      message: 'Success'
    }
  };
};
```

### File Naming Convention

Use underscores to separate path segments and HTTP methods:

- `user_GET_info.js` → `user/GET/info`
- `product_POST_create.js` → `product/POST/create`
- `order_GET_list.js` → `order/GET/list`

## Technical Details

For in-depth information about the architecture, design patterns, and implementation details, see [ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## License

[MIT](/LICENSE)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/dev-server-proxy?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/dev-server-proxy
[npm-downloads-src]: https://img.shields.io/npm/dm/dev-server-proxy?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/dev-server-proxy
[bundle-src]: https://img.shields.io/bundlephobia/minzip/dev-server-proxy?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=dev-server-proxy
[license-src]: https://img.shields.io/github/license/Sunny-117/dev-server-proxy.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/Sunny-117/dev-server-proxy/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/dev-server-proxy
