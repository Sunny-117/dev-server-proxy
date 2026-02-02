/**
 * Mock 文件示例：用户信息接口
 * 文件名格式：模块_方法_路径.js
 * 映射路径：user/GET/info
 */
module.exports = (params) => {
    console.log('📝 Mock: 收到用户信息请求，参数:', params);
    
    return {
        status: 200,
        response: {
            code: 0,
            message: '成功',
            data: {
                userId: params.userId || 123,
                username: 'mockuser',
                email: 'mock@example.com',
                role: 'developer',
                createdAt: '2024-01-01',
                profile: {
                    avatar: 'https://via.placeholder.com/150',
                    bio: '这是一个 Mock 用户数据',
                    location: '北京'
                },
                _meta: {
                    source: 'LOCAL_MOCK',
                    timestamp: new Date().toISOString()
                }
            }
        }
    };
};
