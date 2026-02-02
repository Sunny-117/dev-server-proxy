/**
 * 工具函数：生成商品模板数据
 * utils 目录下的文件也支持热更新
 */
module.exports = (id) => {
    const categories = ['电子产品', '图书', '服装', '食品', '家居'];
    const brands = ['品牌A', '品牌B', '品牌C', '品牌D', '品牌E'];
    
    return {
        id,
        name: `商品 ${id}`,
        category: categories[id % categories.length],
        brand: brands[id % brands.length],
        price: (Math.random() * 1000 + 100).toFixed(2),
        stock: Math.floor(Math.random() * 1000),
        description: `这是商品 ${id} 的详细描述`,
        images: [
            `https://via.placeholder.com/300?text=Product${id}-1`,
            `https://via.placeholder.com/300?text=Product${id}-2`
        ],
        rating: (Math.random() * 2 + 3).toFixed(1),
        sales: Math.floor(Math.random() * 10000)
    };
};
