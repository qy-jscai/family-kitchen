const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// 安全中间件：设置基本安全头部
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
});

// 解析JSON请求体（限制大小防止DDoS）
app.use(express.json({ limit: '10mb' }));

// 设置静态文件服务（添加缓存控制）
app.use(express.static(path.join(__dirname), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0'
}));

// 路由示例 - 可以根据需要修改
app.get('/api/menu', (req, res) => {
    res.json({ 
        message: '菜单数据', 
        items: [],
        timestamp: new Date().toISOString()
    });
});

app.post('/api/order', (req, res) => {
    // 添加简单的请求验证
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: '请求体不能为空' });
    }
    
    res.json({ 
        message: '订单提交成功', 
        orderId: Date.now(),
        status: 'pending'
    });
});

// 健康检查端点（Koyeb需要）
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 必须监听 0.0.0.0 而不是 localhost
app.listen(port, '0.0.0.0', () => {
    console.log(`✅ 家庭厨房外卖系统启动成功！`);
    console.log(`📍 运行端口: ${port}`);
    console.log(`🌐 环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🕒 启动时间: ${new Date().toLocaleString()}`);
    console.log(`🚀 访问地址: 请使用Koyeb提供的域名访问`);
});

// 优雅关机处理（适合云环境）
process.on('SIGTERM', () => {
    console.log('收到SIGTERM信号，开始优雅关机...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('收到SIGINT信号，开始优雅关机...');
    process.exit(0);
});

// 错误处理
process.on('uncaughtException', (error) => {
    console.error('❌ 未捕获的异常:', error);
    // 在实际生产中可能需要更复杂的错误处理
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未处理的Promise拒绝:', reason);
});
