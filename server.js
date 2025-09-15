// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { getDb, backupDatabase } = require('./database');

const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use(express.static('public'));





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













// 数据库实例
const db = getDb();

// 日志中间件
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// API 1: 获取菜单
app.get('/api/menu', (req, res) => {
    const sql = 'SELECT * FROM menu_items WHERE is_available = 1 ORDER BY id';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('获取菜单失败:', err.message);
            return res.status(500).json({ 
                success: false, 
                message: '获取菜单失败',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
        
        res.json({
            success: true,
            data: rows
        });
    });
});

// API 2: 提交订单
app.post('/api/order', async (req, res) => {
    const { customer_name, customer_phone, address, order_items, notes } = req.body;
    
    // 数据验证
    if (!customer_name || !customer_phone || !address || !order_items || !Array.isArray(order_items)) {
        return res.status(400).json({
            success: false,
            message: '请提供完整的订单信息（姓名、电话、地址、菜品）'
        });
    }

    if (order_items.length === 0) {
        return res.status(400).json({
            success: false,
            message: '订单不能为空'
        });
    }

    try {
        // 计算总金额并验证菜品
        let totalAmount = 0;
        for (const item of order_items) {
            const menuItem = await new Promise((resolve, reject) => {
                db.get('SELECT * FROM menu_items WHERE id = ? AND is_available = 1', [item.id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (!menuItem) {
                return res.status(400).json({
                    success: false,
                    message: `菜品ID ${item.id} 不存在或已下架`
                });
            }

            if (menuItem.stock < item.qty) {
                return res.status(400).json({
                    success: false,
                    message: `"${menuItem.name}" 库存不足，剩余 ${menuItem.stock} 份`
                });
            }

            totalAmount += menuItem.price * item.qty;
        }

        // 插入订单
        const orderItemsJson = JSON.stringify(order_items);
        const sql = `
            INSERT INTO orders (customer_name, customer_phone, address, order_items, total_amount, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const params = [customer_name, customer_phone, address, orderItemsJson, totalAmount, notes || ''];

        db.run(sql, params, function(err) {
            if (err) {
                console.error('创建订单失败:', err.message);
                return res.status(500).json({
                    success: false,
                    message: '创建订单失败'
                });
            }

            // 更新库存
            order_items.forEach(item => {
                db.run('UPDATE menu_items SET stock = stock - ? WHERE id = ?', [item.qty, item.id]);
            });

            res.json({
                success: true,
                message: '订单提交成功！',
                data: {
                    orderId: this.lastID,
                    totalAmount: totalAmount
                }
            });
        });

    } catch (error) {
        console.error('订单处理错误:', error.message);
        res.status(500).json({
            success: false,
            message: '订单处理失败'
        });
    }
});

// API 3: 获取所有订单
app.get('/api/orders', (req, res) => {
    const { status, page = 1, limit = 50 } = req.query;
    let sql = `
        SELECT id, customer_name, customer_phone, address, order_items, total_amount, status, notes, 
               datetime(created_at) as created_at, datetime(updated_at) as updated_at
        FROM orders 
    `;
    let params = [];
    
    if (status && status !== 'all') {
        sql += ' WHERE status = ?';
        params.push(status);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('获取订单失败:', err.message);
            return res.status(500).json({
                success: false,
                message: '获取订单失败'
            });
        }

        // 解析订单项
        const ordersWithParsedItems = rows.map(order => ({
            ...order,
            order_items: JSON.parse(order.order_items)
        }));

        // 获取总数用于分页
        let countSql = 'SELECT COUNT(*) as total FROM orders';
        if (status && status !== 'all') {
            countSql += ' WHERE status = ?';
        }

        db.get(countSql, params.slice(0, status && status !== 'all' ? 1 : 0), (err, countRow) => {
            if (err) {
                res.json({
                    success: true,
                    data: ordersWithParsedItems,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: rows.length
                    }
                });
            } else {
                res.json({
                    success: true,
                    data: ordersWithParsedItems,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: countRow.total,
                        pages: Math.ceil(countRow.total / parseInt(limit))
                    }
                });
            }
        });
    });
});

// API 4: 更新订单状态
app.put('/api/order/:id', (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body;
    
    const validStatuses = ['新订单', '已确认', '已完成', '已取消'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: '状态值无效，必须是: ' + validStatuses.join(', ')
        });
    }

    const sql = 'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    db.run(sql, [status, orderId], function(err) {
        if (err) {
            console.error('更新订单失败:', err.message);
            return res.status(500).json({
                success: false,
                message: '更新订单状态失败'
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: '未找到该订单'
            });
        }

        res.json({
            success: true,
            message: '订单状态更新成功'
        });
    });
});

// API 5: 获取订单统计
app.get('/api/stats', (req, res) => {
    const statsSql = `
        SELECT 
            COUNT(*) as total_orders,
            SUM(CASE WHEN status = '新订单' THEN 1 ELSE 0 END) as new_orders,
            SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) as completed_orders,
            SUM(total_amount) as total_revenue
        FROM orders
    `;

    db.get(statsSql, [], (err, row) => {
        if (err) {
            console.error('获取统计失败:', err.message);
            return res.status(500).json({
                success: false,
                message: '获取统计信息失败'
            });
        }

        res.json({
            success: true,
            data: row
        });
    });
});

// API 6: 备份数据库
app.post('/api/backup', async (req, res) => {
    try {
        const backupPath = await backupDatabase();
        res.json({
            success: true,
            message: '备份成功',
            backupPath: backupPath
        });
    } catch (error) {
        console.error('备份失败:', error.message);
        res.status(500).json({
            success: false,
            message: '备份失败'
        });
    }
});

// 健康检查
app.get('/api/health', (req, res) => {
    db.get('SELECT 1 as test', (err) => {
        if (err) {
            res.status(500).json({ 
                status: 'ERROR', 
                database: ' disconnected',
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({ 
                status: 'OK', 
                database: 'connected',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        }
    });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: '接口不存在'
    });
});

// 启动服务器
const server = app.listen(PORT, () => {
    console.log('\n🍳 家庭厨房服务器启动成功！');
    console.log(`📍 服务器地址: http://localhost:${PORT}`);
    console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
    console.log(`📝 API菜单: http://localhost:${PORT}/api/menu`);
    console.log(`👤 用户界面: http://localhost:${PORT}/index.html`);
    console.log(`⚙️  管理后台: http://localhost:${PORT}/admin.html`);
    console.log(`🌐 环境: ${process.env.NODE_ENV}`);
    console.log('----------------------------------------');
});

// 优雅关闭
process.on('SIGINT', async () => {
    console.log('\n🛑 正在关闭服务器...');
    
    try {
        await new Promise((resolve) => server.close(resolve));
        const { closeDatabase } = require('./database');
        await closeDatabase();
        console.log('✅ 服务器已优雅关闭');
        process.exit(0);
    } catch (error) {
        console.error('关闭失败:', error.message);
        process.exit(1);
    }
});

module.exports = app;
