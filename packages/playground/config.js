const path = require('path');

module.exports = {
    // dev-server-proxy 工作的临时目录
    WORK_PATH: __dirname,

    // 本地 mock 接口文件存放的位置
    MOCK_PATH: path.join(__dirname, './mock'),

    // 后端 log ajax 入口，优先级最高
    LOG_API: /^\/api\/log$/,

    // 后端 ajax 入口（模拟统一的后端接口入口）
    AJAX_API: /^\/api\/request$/,
     
    // 自定义后端接口配置，优先级高于 AJAX_API
    CUSTOM_API: [
        {
            // 将特定的 RESTful 接口映射到 path 格式
            rule: url => {
                // 匹配 /api/users/:id 格式
                const match = url.pathname.match(/^\/api\/users\/(\d+)$/);
                if (match) {
                    return 'user/GET/detail';
                }
                // 匹配 /api/products 格式
                if (url.pathname === '/api/products') {
                    return 'product/GET/list';
                }
                return '';
            }
        }
    ],

    // 自定义接口规则，这个规则优先级最高
    PATH_RULES: {
        // 特定接口使用不同的代理
        'user/GET/detail': {
            proxy: 'PROXY_MOCK', // 强制使用 mock
        },
        'product/POST/create': {
            proxy: 'PROXY_TEST', // 强制使用测试环境
        }
    },

    // 线上环境代理配置
    PROXY_ONLINE: {
        host: 'dev.example.com',
        target: 'https://jsonplaceholder.typicode.com', // 使用公开的测试 API
        open: 'http://dev.example.com:3000'
    },

    // 测试环境代理配置
    PROXY_TEST: {
        host: 'dev.example.com',
        target: 'https://jsonplaceholder.typicode.com',
        open: 'http://dev.example.com:3000'
    },

    // 纯本地开发环境配置
    PROXY_MOCK: {
        host: 'dev.example.com',
        open: 'http://dev.example.com:3000',
    }
};
