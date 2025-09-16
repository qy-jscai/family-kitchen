// script.js
// 前端交互逻辑

let cart = [];
let menuItems = [];

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    loadMenu();
});

// 加载菜单
async function loadMenu() {
    showLoading(true);
    try {
        const response = await fetch('/api/menu');
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.message);
        }
        
        menuItems = result.data;
        renderMenu(menuItems);
    } catch (error) {
        showMessage('加载菜单失败: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 渲染菜单
function renderMenu(items) {
    const menuList = document.getElementById('menuList');
    menuList.innerHTML = '';
    
    items.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item';
        menuItem.innerHTML = `
            <h3>${item.name}</h3>
            <div class="price">¥${item.price.toFixed(2)}</div>
            <div class="description">${item.description || '暂无描述'}</div>
            <button class="add-to-cart" onclick="addToCart(${item.id})">
                加入购物车
            </button>
        `;
        menuList.appendChild(menuItem);
    });
}

// 添加到购物车
function addToCart(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;
    
    const existingItem = cart.find(i => i.id === itemId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1
        });
    }
    
    updateCart();
    showMessage(`已添加 ${item.name} 到购物车`, 'success');
}

// 从购物车移除
function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    updateCart();
}

// 更新购物车数量
function updateCartQuantity(itemId, change) {
    const item = cart.find(i => i.id === itemId);
    if (!item) return;
    
    item.quantity += change;
    
    if (item.quantity <= 0) {
        removeFromCart(itemId);
    } else {
        updateCart();
    }
}

// 更新购物车显示
function updateCart() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const totalPrice = document.getElementById('totalPrice');
    
    // 更新购物车数量
    cartCount.textContent = cart.reduce((total, item) => total + item.quantity, 0);
    
    // 更新购物车内容
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">购物车是空的</p>';
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div>${item.name}</div>
                    <div>¥${item.price.toFixed(2)} × ${item.quantity}</div>
                </div>
                <div class="cart-item-controls">
                    <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, 1)">+</button>
                    <button onclick="removeFromCart(${item.id})">删除</button>
                </div>
            </div>
        `).join('');
    }
    
    // 更新总价
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalPrice.textContent = total.toFixed(2);
}

// 切换购物车显示
function toggleCart() {
    const cartSidebar = document.getElementById('cartSidebar');
    cartSidebar.classList.toggle('open');
}

// 显示下单表单
function showOrderForm() {
    if (cart.length === 0) {
        showMessage('请先添加商品到购物车', 'error');
        return;
    }
    
    const modal = document.getElementById('orderFormModal');
    modal.style.display = 'block';
}

// 关闭下单表单
function closeOrderForm() {
    const modal = document.getElementById('orderFormModal');
    modal.style.display = 'none';
}

// 提交订单
async function submitOrder(event) {
    event.preventDefault();
    
    const formData = {
        customer_name: document.getElementById('customerName').value,
        customer_phone: document.getElementById('customerPhone').value,
        address: document.getElementById('address').value,
        notes: document.getElementById('notes').value,
        order_items: cart.map(item => ({
            id: item.id,
            qty: item.quantity
        }))
    };
    
    // 简单验证
    if (!formData.customer_name || !formData.customer_phone || !formData.address) {
        showMessage('请填写完整的订单信息', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.message);
        }
        
        showMessage('订单提交成功！', 'success');
        closeOrderForm();
        resetCart();
        
        // 清空表单
        document.getElementById('orderForm').reset();
        
    } catch (error) {
        showMessage('提交订单失败: ' + error.message, 'error');
    }
}

// 重置购物车
function resetCart() {
    cart = [];
    updateCart();
    toggleCart(); // 关闭购物车
}

// 显示加载提示
function showLoading(show) {
    const loading = document.getElementById('loading');
    loading.style.display = show ? 'block' : 'none';
}

// 显示消息提示
function showMessage(message, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 3000);
}

// 绑定表单提交事件
document.getElementById('orderForm').addEventListener('submit', submitOrder);

// 点击弹窗外部关闭
window.addEventListener('click', function(event) {
    const modal = document.getElementById('orderFormModal');
    if (event.target === modal) {
        closeOrderForm();
    }
});
