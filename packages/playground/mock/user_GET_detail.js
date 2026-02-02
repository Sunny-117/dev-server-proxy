/**
 * Mock 文件：用户详情接口
 * 映射路径：user/GET/detail
 * 这个接口会被 CUSTOM_API 规则匹配（/api/users/:id）
 */
module.exports = (params) => {
    console.log('📝 Mock: 收到用户详情请求（通过 CUSTOM_API 映射）');
    
    return {
        status: 200,
        response: {
            code: 0,
            message: '成功',
            data: {
                id: 123,
                username: 'customuser',
                email: 'custom@example.com',
                fullName: '张三',
                phone: '13800138000',
                department: '技术部',
                position: '高级工程师',
                skills: ['JavaScript', 'Node.js', 'React', 'Webpack'],
                projects: [
                    { name: '项目A', role: '负责人' },
                    { name: '项目B', role: '开发者' }
                ],
                _meta: {
                    source: 'LOCAL_MOCK',
                    mappedBy: 'CUSTOM_API',
                    timestamp: new Date().toISOString()
                }
            }
        }
    };
};
