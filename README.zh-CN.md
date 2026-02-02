# Dev Server Proxy

[English](./README.md)

一个为 webpack-dev-server 设计的动态代理中间件，支持**无需重启服务即可热更新代理配置和 mock 数据**。

## 为什么选择 Dev Server Proxy？

在前端开发过程中，你经常需要：
- 在本地 mock 数据和远程服务器之间切换
- 针对不同环境（开发、测试、生产）进行测试
- 为特定 API 使用不同的代理策略

传统方式需要修改配置文件并重启 webpack，这会导致：
- 开发效率降低（等待编译时间）
- 工作流程中断
- 跨环境调试困难

**Dev Server Proxy 通过简单的 `.devserverrc` 文件实现实时配置更新，解决了这些问题。**

## 特性

- 🔥 **热配置重载** - 无需重启即可更新代理规则
- 📝 **热 Mock 更新** - 修改 mock 文件立即生效
- 🎯 **灵活路由** - 支持全局代理、自定义 API 规则和路径级配置
- 🌍 **多环境支持** - 内置支持 mock、test、staging 和 production 环境
- ⚡ **兼容 Webpack 4 & 5** - 同时支持两个主要版本
- 📦 **支持 Rspack** - 与 Rspack 的 webpack-dev-server 无缝集成

## 快速开始

### 安装

```bash
npm install dev-server-proxy --save-dev
# 或
pnpm add dev-server-proxy -D
```

### 基础配置

**1. 在 package.json 中添加脚本**

Webpack < 5（使用 `--proxy` 参数）：
```json
{
  "scripts": {
    "start": "webpack-dev-server --config webpack.dev.config.js --proxy mock",
    "start:online": "webpack-dev-server --config webpack.dev.config.js --proxy online"
  }
}
```

Webpack >= 5（使用 `PROXY` 环境变量）：
```json
{
  "scripts": {
    "start": "PROXY=mock webpack serve --config webpack.dev.config.js",
    "start:online": "PROXY=online webpack serve --config webpack.dev.config.js"
  }
}
```

**2. 配置 webpack devServer**

Webpack 配置：
```javascript
const devServerProxy = require('dev-server-proxy');
const config = require('./config');

module.exports = {
  devServer: {
    ...devServerProxy(config),
    // Webpack 5 需要传入版本号：
    // ...devServerProxy(config, 5),
    historyApiFallback: true,
    port: 3000
  }
};
```

Rspack 配置：
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

**3. 创建 config.js**

```javascript
const path = require('path');

module.exports = {
  WORK_PATH: __dirname,
  MOCK_PATH: path.join(__dirname, './mock'),
  AJAX_API: /^\/api\/request.ajax$/,
  
  // 环境配置
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

**4. 配置 hosts 文件**

```
127.0.0.1 dev.example.com
```

**5. 创建 mock 文件**

在 `MOCK_PATH` 目录下创建 mock 文件。文件名使用下划线分隔路径段：

```javascript
// 文件：mock/user_GET_info.js
// 对应路径：user/GET/info

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

**6. 启动开发**

```bash
npm start
```

## 动态配置

修改工作目录下的 `.devserverrc` 文件即可实时更改代理设置：

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

修改后立即生效，无需重启开发服务器！

## 配置选项

### 必需字段

- `WORK_PATH` - 工作目录路径
- `MOCK_PATH` - mock 文件目录
- `AJAX_API` - 匹配 API 端点的正则表达式

### 环境配置

为不同环境定义代理配置：

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

### 自定义 API 规则

对于非标准 API 模式，使用 `CUSTOM_API`：

```javascript
{
  CUSTOM_API: [
    {
      rule: (parsedUrl) => {
        // 自定义逻辑从 URL 提取路径
        if (parsedUrl.pathname.startsWith('/custom/')) {
          return parsedUrl.pathname.replace('/custom/', '');
        }
      }
    }
  ]
}
```

## 高级用法

### 手动集成中间件

如果需要更多控制，可以手动集成中间件：

```javascript
const startMockWatch = require('dev-server-proxy/src/startWatch');
const getProxyMiddleware = require('dev-server-proxy/src/core/server');
const config = require('./config');

// 启动文件监听
startMockWatch(config);

// 在 Express 应用中使用中间件
app.use('/', getProxyMiddleware(config));
```

## Mock 文件格式

Mock 文件应导出一个函数，接收请求参数并返回响应对象：

```javascript
module.exports = (params) => {
  // params 包含解析后的请求参数
  console.log('请求参数:', params);
  
  return {
    status: 200,  // HTTP 状态码
    response: {   // 响应体
      code: 0,
      data: { /* 你的数据 */ },
      message: '成功'
    }
  };
};
```

### 文件命名规范

使用下划线分隔路径段和 HTTP 方法：

- `user_GET_info.js` → `user/GET/info`
- `product_POST_create.js` → `product/POST/create`
- `order_GET_list.js` → `order/GET/list`

## 技术细节

关于架构、设计模式和实现细节的深入信息，请参阅 [ARCHITECTURE.zh-CN.md](./ARCHITECTURE.zh-CN.md)。

## 许可证

[MIT](/LICENSE)
