// API 请求工具函数
async function request(url, options = {}) {
    try {
        const response = await fetch(url, {
            method: options.method || 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                ...options.headers
            },
            body: options.body
        });
        return await response.json();
    } catch (error) {
        throw new Error(`请求失败: ${error.message}`);
    }
}

// 显示响应结果
function showResponse(elementId, data, isError = false) {
    const element = document.getElementById(elementId);
    element.style.display = 'block';
    element.className = `response ${isError ? 'error' : 'success'}`;
    element.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
}

// 显示加载状态
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    element.style.display = 'block';
    element.className = 'response loading';
    element.innerHTML = '<pre>加载中...</pre>';
}

// 测试标准 AJAX_API 接口
window.testAjaxApi = async function() {
    showLoading('ajax-response');
    try {
        const params = JSON.stringify({ userId: 123 });
        const body = `params=${encodeURIComponent(params)}`;
        const data = await request('/api/request?path=user/GET/info', { body });
        showResponse('ajax-response', data);
    } catch (error) {
        showResponse('ajax-response', { error: error.message }, true);
    }
};

// 测试商品列表接口
window.testProductList = async function() {
    showLoading('ajax-response');
    try {
        const params = JSON.stringify({ page: 1, pageSize: 10 });
        const body = `params=${encodeURIComponent(params)}`;
        const data = await request('/api/request?path=product/GET/list', { body });
        showResponse('ajax-response', data);
    } catch (error) {
        showResponse('ajax-response', { error: error.message }, true);
    }
};

// 测试自定义 CUSTOM_API
window.testCustomApi = async function() {
    showLoading('custom-response');
    try {
        // 这个请求会被 CUSTOM_API 规则映射到 user/GET/detail
        const data = await request('/api/users/123', { method: 'GET' });
        showResponse('custom-response', data);
    } catch (error) {
        showResponse('custom-response', { error: error.message }, true);
    }
};

// 测试产品接口
window.testProductApi = async function() {
    showLoading('custom-response');
    try {
        // 这个请求会被 CUSTOM_API 规则映射到 product/GET/list
        const data = await request('/api/products', { method: 'GET' });
        showResponse('custom-response', data);
    } catch (error) {
        showResponse('custom-response', { error: error.message }, true);
    }
};

// 测试代理接口（需要修改 .devserverrc 切换到 PROXY_TEST 或 PROXY_ONLINE）
window.testProxyApi = async function() {
    showLoading('proxy-response');
    try {
        const params = JSON.stringify({ id: 1 });
        const body = `params=${encodeURIComponent(params)}`;
        const data = await request('/api/request?path=remote/GET/data', { body });
        showResponse('proxy-response', {
            message: '如果看到 404，说明当前是 MOCK 模式',
            tip: '修改 .devserverrc 中的 PROXY 字段为 PROXY_TEST 或 PROXY_ONLINE',
            data
        });
    } catch (error) {
        showResponse('proxy-response', { error: error.message }, true);
    }
};

// 测试日志接口
window.testLogApi = async function() {
    showLoading('log-response');
    try {
        const logData = {
            level: 'info',
            message: 'Test log from playground',
            timestamp: new Date().toISOString()
        };
        const data = await request('/api/log', {
            method: 'POST',
            body: JSON.stringify(logData)
        });
        showResponse('log-response', {
            message: '日志已发送',
            sent: logData,
            response: data
        });
    } catch (error) {
        showResponse('log-response', { error: error.message }, true);
    }
};

console.log('🚀 Webpack Dev Server Proxy Playground 已启动！');
console.log('📝 尝试点击页面上的按钮测试各种接口');
console.log('🔧 修改 .devserverrc 文件可以动态切换代理配置');
