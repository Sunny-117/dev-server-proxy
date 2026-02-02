# Dev Server Proxy Playground

这是一个用于测试 dev-server-proxy 的示例项目，支持 **Webpack** 和 **Rspack** 两种构建工具。

## 🚀 快速开始

### 1. 安装依赖
```bash
cd playground
npm install
```

### 2. 配置 hosts（可选）
如果想测试自定义域名，可以在 `/etc/hosts` 中添加：
```
127.0.0.1 dev.example.com
```

### 3. 启动开发服务器

#### 使用 Webpack（端口 3001）
```bash
# 使用 mock 模式（默认）
npm start

# 或者明确指定模式
npm run start:mock    # 本地 mock 模式
npm run start:test    # 测试环境代理模式
npm run start:online  # 线上环境代理模式
```

#### 使用 Rspack（端口 3002）
```bash
# 使用 mock 模式
npm run start:rspack:mock

# 测试环境代理模式
npm run start:rspack:test

# 线上环境代理模式
npm run start:rspack:online
```

### 4. 访问页面
打开浏览器访问：
- Webpack: http://localhost:3001
- Rspack: http://localhost:3002
- 或使用自定义域名（如果配置了 hosts）

## 📦 Rspack 集成说明

Rspack 使用基于 webpack-dev-server 的 `@rspack/dev-server`，因此可以无缝集成 dev-server-proxy。

**配置差异：**
- Rspack 使用 `server: 'https'` 而不是 `https: true`
- 其他配置（`setupMiddlewares`、`allowedHosts`、`open` 等）完全兼容

查看 `rspack.dev.config.js` 了解具体配置方式。

## 📖 功能演示

### 1. 本地 Mock 数据
点击页面上的按钮，测试本地 mock 接口：
- **用户信息接口**：`user/GET/info`
- **商品列表接口**：`product/GET/list`
- **用户详情接口**：`user/GET/detail`（通过 CUSTOM_API 映射）

### 2. 动态配置切换
服务启动后，会在 `playground/` 目录下生成 `.devserverrc` 文件。

**尝试修改这个文件来动态切换配置：**

```json
{
    "PROXY": "PROXY_MOCK",
    "PATH_RULES": {
        "user/GET/detail": {
            "proxy": "PROXY_MOCK"
        }
    }
}
```

修改 `PROXY` 字段：
- `"PROXY_MOCK"` - 使用本地 mock 数据
- `"PROXY_TEST"` - 代理到测试环境
- `"PROXY_ONLINE"` - 代理到线上环境

**无需重启服务，配置会自动生效！**

### 3. Mock 文件热更新
修改 `mock/` 目录下的任何文件，都会自动生效，无需重启服务。

**尝试修改 `mock/user_GET_info.js`：**
```javascript
module.exports = (params) => {
    return {
        status: 200,
        response: {
            code: 0,
            message: '成功',
            data: {
                username: '修改后的用户名', // 修改这里
                email: 'new@example.com'
            }
        }
    };
};
```

保存后，再次点击"测试用户信息接口"按钮，会看到新的数据。

### 4. 自定义 API 规则
在 `config.js` 中配置了 `CUSTOM_API`，可以将 RESTful 风格的接口映射到 path 格式：

```javascript
CUSTOM_API: [
    {
        rule: url => {
            // /api/users/123 → user/GET/detail
            const match = url.pathname.match(/^\/api\/users\/(\d+)$/);
            if (match) return 'user/GET/detail';
            
            // /api/products → product/GET/list
            if (url.pathname === '/api/products') return 'product/GET/list';
            
            return '';
        }
    }
]
```

### 5. 路径级别的代理规则
在 `config.js` 中配置了 `PATH_RULES`，可以为特定接口指定代理规则：

```javascript
PATH_RULES: {
    'user/GET/detail': {
        proxy: 'PROXY_MOCK', // 这个接口强制使用 mock
    },
    'product/POST/create': {
        proxy: 'PROXY_TEST', // 这个接口强制使用测试环境
    }
}
```

## 🎯 测试场景

### 场景 1：纯本地开发
```bash
npm run start:mock
```
所有接口都使用本地 mock 数据，适合前端独立开发。

### 场景 2：部分接口使用 mock，部分代理到远程
1. 启动服务：`npm start`
2. 修改 `.devserverrc`：
```json
{
    "PROXY": "PROXY_TEST",
    "PATH_RULES": {
        "user/GET/info": {
            "proxy": "PROXY_MOCK"
        }
    }
}
```
这样 `user/GET/info` 使用 mock，其他接口代理到测试环境。

### 场景 3：快速切换环境
开发过程中需要对比不同环境的数据：
1. 修改 `.devserverrc` 中的 `PROXY` 字段
2. 刷新页面，立即看到不同环境的数据
3. 无需重启服务！

## 💡 技巧

1. **查看控制台日志**：打开浏览器控制台和终端，可以看到详细的请求日志
2. **修改 mock 数据**：直接编辑 `mock/` 目录下的文件，保存即生效
3. **添加新接口**：在 `mock/` 目录下创建新文件，文件名格式：`模块_方法_路径.js`
4. **调试代理**：修改 `.devserverrc` 切换代理目标，观察不同环境的响应

## 🔧 常见问题

### Q: 修改配置后没有生效？
A: 检查 `.devserverrc` 文件格式是否正确（必须是有效的 JSON）

### Q: Mock 文件修改后没有生效？
A: 确保文件名格式正确（使用下划线分隔），并且在 `mock/` 目录下

### Q: 如何添加新的代理环境？
A: 在 `config.js` 中添加新的 `PROXY_XXX` 配置，然后在 `.devserverrc` 中使用
