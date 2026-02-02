# 架构文档

[English](./docs/ARCHITECTURE.md)

本文档深入介绍 Dev Server Proxy 的技术实现、架构设计和设计模式。

## 目录

- [整体架构](#整体架构)
- [核心模块](#核心模块)
- [设计模式](#设计模式)
- [数据流转](#数据流转)
- [技术要点](#技术要点)

## 整体架构

Dev Server Proxy 采用**中间件模式**设计，通过文件监听实现热更新。核心是一个 Express/Connect 风格的中间件，拦截请求并将其路由到适当的处理器。

```
┌─────────────────────────────────────────────────────────┐
│                    webpack-dev-server                    │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  代理中间件                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │  请求路由器 (server.ts)                           │  │
│  │  ├─ 日志请求 → log 中间件                         │  │
│  │  ├─ 路径提取 → CUSTOM_API / AJAX_API             │  │
│  │  ├─ 代理目标 → proxy 中间件                       │  │
│  │  └─ Mock → mock 中间件                           │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 日志处理器    │ │ 代理处理器    │ │ Mock 处理器  │
└──────────────┘ └──────────────┘ └──────────────┘
                        │               │
                        ▼               ▼
                ┌──────────────┐ ┌──────────────┐
                │ 远程服务器    │ │ 本地文件      │
                └──────────────┘ └──────────────┘

        ┌─────────────────────────────────┐
        │      监听系统                    │
        │  ┌────────────┐ ┌─────────────┐│
        │  │配置监听     │ │Mock 文件    ││
        │  │(.devserverrc)│ │监听        ││
        │  └────────────┘ └─────────────┘│
        └─────────────────────────────────┘
```

## 核心模块

### 1. 入口模块 (`index.ts`)

**职责：**
- 解析启动参数，确定代理类型（mock/test/staging/production）
- 启动配置和 mock 文件监听
- 生成 webpack devServer 配置对象
- 处理 webpack 4 和 webpack 5 之间的兼容性

**关键逻辑：**
```typescript
// 1. 从 CLI 参数或环境变量获取代理类型
const type = getServerType(config);

// 2. 启动文件监听
startMockWatch(config, type);

// 3. 根据 webpack 版本返回不同配置
if (webpackVersion < 5) {
    return { 
        before(app) { 
            app.use(server(config)); 
        } 
    };
} else {
    return { 
        setupMiddlewares: (middlewares) => {
            middlewares.unshift({
                name: 'proxy mock',
                middleware: server(config)
            });
            return middlewares;
        } 
    };
}
```

### 2. 请求路由器 (`server.ts`)

**职责：** 核心路由逻辑，决定请求的处理方式

**处理流程：**
```
请求到达
  │
  ├─ 1. 是否为日志请求？(LOG_API)
  │     └─ 是 → log 中间件 → 返回
  │
  ├─ 2. 提取 API 路径
  │     ├─ 优先尝试 CUSTOM_API 规则
  │     └─ 然后尝试 AJAX_API + query.path
  │
  ├─ 3. 未提取到路径？
  │     └─ 是 → next() → 传递给下一个中间件
  │
  ├─ 4. 确定代理目标
  │     ├─ 优先级 1: PATH_RULES[path].target
  │     ├─ 优先级 2: PATH_RULES[path].proxy
  │     └─ 优先级 3: 全局 PROXY 配置
  │
  ├─ 5. 有代理目标？
  │     └─ 是 → proxy 中间件 → 返回
  │
  └─ 6. 默认 → mock 中间件 → 返回
```

**关键代码：**
```typescript
function getPath(config, parsedUrl) {
    // 1. 尝试自定义规则
    if (CUSTOM_API) {
        for (let api of CUSTOM_API) {
            const customPath = api.rule(parsedUrl);
            if (customPath) return customPath;
        }
    }
    
    // 2. 尝试标准 AJAX_API
    if (AJAX_API.test(parsedUrl.pathname)) {
        return parsedUrl.query.path;
    }
    
    return '';
}
```

### 3. 配置监听器 (`watchConfig.ts`)

**职责：** 监听 `.devserverrc` 文件变化，实现配置热更新

**实现原理：**
```typescript
// 1. 初始化时写入配置文件
writeServerConfig(configFile, innerConfig);

// 2. 使用 fs.watch 监听文件变化
fs.watch(config.WORK_PATH, (event, filename) => {
    if (filename === '.devserverrc') {
        // 3. 重新读取并更新内存中的配置
        innerConfig = JSON.parse(fs.readFileSync(configFile));
    }
});

// 4. 提供 get() 方法供其他模块获取最新配置
export const get = () => innerConfig;
```

**设计亮点：**
- 单例模式确保全局只有一个监听实例
- 配置存储在内存中，访问速度快
- 支持特定字段的动态修改（PROXY、PATH_RULES 等）

### 4. Mock 文件监听器 (`watchMockFiles.ts`)

**职责：** 监听 mock 目录变化，实现 mock 文件热更新

**实现原理：**
```typescript
// 1. 初始化时扫描目录，建立路径映射
pathMap = getPathMap(mockPath);
// 示例: { "api/GET/user/info": "/path/to/api_GET_user_info.js" }

// 2. 监听目录变化（递归监听）
fs.watch(mockPath, {recursive: true}, (evt, file) => {
    // 3. 使用防抖机制，避免频繁更新
    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
        // 4. 重新扫描目录
        update(getPathMap(mockPath));
        
        // 5. 清除 require 缓存，强制重新加载
        delete require.cache[require.resolve(newFile)];
    }, 100);
});
```

**设计亮点：**
- 递归监听整个目录树
- 防抖处理，避免频繁触发
- 清除 Node.js require 缓存，实现真正的热更新
- 检测路径冲突，当多个文件映射到同一路径时发出警告

### 5. Mock 中间件 (`mock.ts`)

**职责：** 加载并执行本地 mock 文件，返回模拟数据

**处理流程：**
```typescript
// 1. 从 watchMockFiles 获取路径映射
const {pathMap, pathErrors} = watchMockFiles.get();

// 2. 查找对应的 mock 文件
const file = pathMap[path];

// 3. 动态加载并执行
const func = require(file);
const {status, response} = func(params);

// 4. 返回结果
res.status(status);
res.send(JSON.stringify(response));
```

**特性：**
- 支持函数式 mock，可根据请求参数动态生成数据
- 自动解析请求参数（支持 querystring 和 JSON 格式）
- 错误处理：文件不存在、非函数、执行异常等

### 6. 代理中间件 (`proxy.ts`)

**职责：** 将请求转发到远程服务器

**实现细节：**
```typescript
// 1. 构造目标 URL
const url = `${target}${req.url}`;

// 2. 处理请求头（关键：修改 origin、referer、host）
const headers = {
    ...req.headers,
    'origin': target,
    'referer': target,
    'host': target.replace(/https?:\/\//, '')
};

// 3. 使用 request 库转发请求
request({
    url, 
    headers, 
    method: 'POST', 
    body: req.body
}, (error, response, body) => {
    res.status(200);
    res.send(body);
});
```

**设计考虑：**
- 修改请求头以绕过跨域限制
- 保留原始请求体
- 统一使用 POST 方法（适配特定后端接口规范）

### 7. 日志中间件 (`log.ts`)

**职责：** 处理前端日志上报请求

**特殊处理：**
- 支持 lz-string 压缩格式的日志数据
- 自动解压并格式化输出
- 不转发到远程服务器，直接在本地处理

## 设计模式

### 1. 中间件模式（Middleware Pattern）
整个项目基于 Express/Connect 中间件模式：
```typescript
(request, response, next) => {
    if (shouldHandle) {
        // 处理并返回
    } else {
        next(); // 传递给下一个中间件
    }
}
```

### 2. 单例模式（Singleton Pattern）
配置监听和文件监听都使用单例模式：
```typescript
let started = false;

export const start = () => {
    if (started) return;
    started = true;
    // 初始化逻辑
};
```

### 3. 策略模式（Strategy Pattern）
根据不同条件选择不同的处理策略：
- 日志请求 → log 中间件
- 有代理目标 → proxy 中间件
- 默认 → mock 中间件

### 4. 观察者模式（Observer Pattern）
使用 `fs.watch` 监听文件变化，实现配置和 mock 文件的热更新。

## 数据流转

```
┌─────────────┐
│ 用户请求     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│ server.ts (主路由)                   │
│ 1. 解析 URL                          │
│ 2. 读取最新配置                       │
└──────┬──────────────────────────────┘
       │
       ├─ 匹配 LOG_API？
       │    └─ 是 → log.ts → 返回
       │
       ├─ 提取路径
       │    ├─ CUSTOM_API.rule(url)
       │    └─ AJAX_API + query.path
       │
       ├─ 无路径？
       │    └─ 是 → next() → 其他中间件
       │
       ├─ 确定目标
       │    ├─ PATH_RULES[path].target
       │    ├─ PATH_RULES[path].proxy → config[proxy].target
       │    └─ config[PROXY].target
       │
       ├─ 有目标？
       │    └─ 是 → proxy.ts → 远程服务器 → 返回
       │
       └─ 默认 → mock.ts
                   │
                   ├─ watchMockFiles.get()
                   ├─ 查找 pathMap[path]
                   ├─ require(file)
                   ├─ func(params)
                   └─ 返回 mock 数据
```

## 技术要点

### 文件监听与热更新

```typescript
// 监听目录
fs.watch(path, {recursive: true}, callback);

// 清除 require 缓存实现热更新
delete require.cache[require.resolve(file)];
```

### Webpack 兼容性

同时支持 webpack 4 和 webpack 5：

```typescript
// webpack 4
return {
    before(app) {
        app.use(middleware);
    }
};

// webpack 5
return {
    setupMiddlewares: (middlewares) => {
        middlewares.unshift({
            name: 'proxy mock',
            middleware: middleware
        });
        return middlewares;
    }
};
```

### 路径提取策略

灵活的路径提取，支持多种模式：
1. 自定义 API 规则（最高优先级）
2. 标准 AJAX_API 模式
3. 回退到下一个中间件

### 配置优先级

清晰的配置优先级系统：
1. 路径特定目标（PATH_RULES[path].target）
2. 路径特定代理引用（PATH_RULES[path].proxy）
3. 全局代理配置（PROXY）

这种分层方法在保持简单性的同时提供了最大的灵活性。
