/**
 * Mock 文件：商品列表接口
 * 映射路径：product/GET/list
 */
const getProductTpl = require('./utils/getProductTpl');

module.exports = (params) => {
    console.log('📝 Mock: 收到商品列表请求，参数:', params);
    
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    
    // 生成模拟商品数据
    const products = [];
    for (let i = 0; i < pageSize; i++) {
        products.push(getProductTpl(i + 1));
    }
    
    return {
        status: 200,
        response: {
            code: 0,
            message: '成功',
            data: {
                list: products,
                pagination: {
                    page,
                    pageSize,
                    total: 100,
                    totalPages: Math.ceil(100 / pageSize)
                },
                _meta: {
                    source: 'LOCAL_MOCK',
                    timestamp: new Date().toISOString()
                }
            }
        }
    };
};
