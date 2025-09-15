const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// 设置静态文件服务（托管HTML、CSS、JS文件）
app.use(express.static(path.join(__dirname)));

// 解析JSON请求体
app.use(express.json());

// 路由示例 - 可以根据需要修改
app.get('/api/menu', (req, res) => {
    res.json({ message: '菜单数据', items: [] });
});

app.post('/api/order', (req, res) => {
    res.json({ message: '订单提交成功', orderId: Date.now() });
});

// 必须监听 0.0.0.0 而不是 localhost
app.listen(port, '0.0.0.0', () => {
    console.log(`✅ 家庭厨房外卖系统启动成功！`);
    console.log(`📍 本地访问: http://localhost:${port}`);
    console.log(`🌐 外部访问: 端口 ${port}`);
    console.log(`🕒 启动时间: ${new Date().toLocaleString()}`);
});

// 错误处理
process.on('uncaughtException', (error) => {
    console.error('❌ 未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未处理的Promise拒绝:', reason);
});
