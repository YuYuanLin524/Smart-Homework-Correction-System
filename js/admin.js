/**
 * 智能作业批改系统 - 管理员功能
 * 负责邀请码管理和系统设置
 */

// 管理员信息
let currentAdmin = null;

// 初始化数据库
console.log('初始化数据库...');
window.db.init().then(() => {
    console.log('数据库初始化成功');
    
    // 检查管理员登录状态
    checkAdminLoginStatus();
    
    // 初始化管理员界面
    initAdminUI();
}).catch(error => {
    console.error('数据库初始化失败:', error);
});

/**
 * 检查管理员登录状态
 */
function checkAdminLoginStatus() {
    // 从localStorage获取管理员登录状态
    const adminJson = localStorage.getItem('currentAdmin');
    
    if (adminJson) {
        try {
            currentAdmin = JSON.parse(adminJson);
            updateUIForLoggedInAdmin();
            
            // 自动加载邀请码列表
            loadInviteCodes();
        } catch (error) {
            console.error('解析管理员数据失败:', error);
            logoutAdmin();
        }
    } else {
        updateUIForLoggedOutAdmin();
    }
}

/**
 * 初始化管理员界面
 */
function initAdminUI() {
    // 管理员登录按钮点击事件
    document.getElementById('admin-login-btn').addEventListener('click', loginAdmin);
    
    // 管理员退出按钮点击事件
    document.getElementById('admin-logout-btn').addEventListener('click', logoutAdmin);
    
    // 标签页切换事件
    const tabs = document.querySelectorAll('.admin-tabs .tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // 生成邀请码按钮点击事件
    document.getElementById('generate-invite-code-btn').addEventListener('click', generateInviteCode);
    
    // 刷新邀请码按钮点击事件
    document.getElementById('refresh-invite-codes-btn').addEventListener('click', loadInviteCodes);
    
    // 导出邀请码按钮点击事件
    document.getElementById('export-invite-codes-btn').addEventListener('click', exportInviteCodes);
    
    console.log('管理员界面初始化完成');
}

/**
 * 处理管理员登录
 */
function handleAdminLogin() {
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value;
    
    if (!username || !password) {
        alert('请输入用户名和密码');
        return;
    }
    
    // 超级管理员账号验证（实际应用中应该使用更安全的方式）
    if (username === 'admin' && password === 'admin123') {
        currentAdmin = {
            username: 'admin',
            role: 'superadmin',
            name: '系统管理员'
        };
        
        // 保存登录状态
        localStorage.setItem('currentAdmin', JSON.stringify(currentAdmin));
        
        // 更新UI
        updateUIForLoggedInAdmin();
        
        // 加载邀请码列表
        loadInviteCodes();
    } else {
        alert('用户名或密码错误');
    }
}

/**
 * 管理员退出登录
 */
function logoutAdmin() {
    currentAdmin = null;
    localStorage.removeItem('currentAdmin');
    updateUIForLoggedOutAdmin();
}

/**
 * 更新UI为管理员已登录状态
 */
function updateUIForLoggedInAdmin() {
    document.getElementById('admin-login-section').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    
    // 更新显示的管理员名称
    document.getElementById('admin-name').textContent = currentAdmin.name;
}

/**
 * 更新UI为管理员未登录状态
 */
function updateUIForLoggedOutAdmin() {
    document.getElementById('admin-login-section').style.display = 'flex';
    document.getElementById('admin-panel').style.display = 'none';
    
    // 清空邀请码列表
    document.getElementById('invite-codes-list').innerHTML = '';
}

/**
 * 加载邀请码列表
 */
function loadInviteCodes() {
    console.log('开始加载邀请码列表');
    
    // 清空邀请码列表
    const inviteCodesList = document.getElementById('invite-codes-list');
    inviteCodesList.innerHTML = '<tr><td colspan="6" class="loading-message">正在加载邀请码...</td></tr>';
    
    // 从数据库获取所有邀请码
    window.db.getAllInviteCodes().then(inviteCodes => {
        console.log('成功获取邀请码列表，数量:', inviteCodes.length);
        
        // 清空加载消息
        inviteCodesList.innerHTML = '';
        
        if (inviteCodes.length === 0) {
            inviteCodesList.innerHTML = '<tr><td colspan="6" class="empty-message">暂无邀请码，请点击"生成邀请码"按钮创建</td></tr>';
            return;
        }
        
        // 按创建日期排序，最新的在前面
        inviteCodes.sort((a, b) => new Date(b.created) - new Date(a.created));
        
        // 渲染邀请码列表
        renderInviteCodesList(inviteCodes);
    }).catch(error => {
        console.error('获取邀请码列表失败:', error);
        inviteCodesList.innerHTML = `<tr><td colspan="6" class="error-message">加载邀请码失败: ${error.message}</td></tr>`;
    });
}

/**
 * 渲染邀请码列表
 * @param {Array} inviteCodes - 邀请码数组
 */
function renderInviteCodesList(inviteCodes) {
    const inviteCodesList = document.getElementById('invite-codes-list');
    inviteCodesList.innerHTML = '';
    
    if (inviteCodes.length === 0) {
        inviteCodesList.innerHTML = '<tr><td colspan="6" class="text-center">暂无邀请码</td></tr>';
        return;
    }
    
    inviteCodes.forEach(code => {
        const row = document.createElement('tr');
        
        // 设置行的类，根据状态显示不同颜色
        if (code.status === 'depleted') {
            row.className = 'depleted';
        } else if (code.status === 'expired') {
            row.className = 'expired';
        } else if (code.usedCount > 0) {
            row.className = 'used';
        }
        
        row.innerHTML = `
            <td>${code.code}</td>
            <td>${code.type === 'student' ? '学生' : '教师'}</td>
            <td>${code.status === 'active' ? '有效' : code.status === 'used' ? '已使用' : '已过期'}</td>
            <td>${code.usedCount > 0 ? '<span style="color: #f44336;">已使用</span>' : '<span style="color: #4caf50;">未使用</span>'}</td>
            <td>${new Date(code.expiryDate).toLocaleDateString()}</td>
            <td>
                <button class="btn small-btn copy-btn" data-code="${code.code}">复制</button>
                <button class="btn small-btn delete-btn" data-code="${code.code}">删除</button>
            </td>
        `;
        
        // 添加复制按钮点击事件
        const copyBtn = row.querySelector('.copy-btn');
        copyBtn.addEventListener('click', function() {
            const codeText = this.getAttribute('data-code');
            navigator.clipboard.writeText(codeText).then(() => {
                alert('邀请码已复制到剪贴板');
            }).catch(err => {
                console.error('复制失败:', err);
                // 备用复制方法
                const textarea = document.createElement('textarea');
                textarea.value = codeText;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                alert('邀请码已复制到剪贴板');
            });
        });
        
        // 添加删除按钮点击事件
        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function() {
            const codeText = this.getAttribute('data-code');
            if (confirm(`确定要删除邀请码 ${codeText} 吗？`)) {
                deleteInviteCode(codeText);
            }
        });
        
        inviteCodesList.appendChild(row);
    });
}

/**
 * 生成新的邀请码
 */
function generateInviteCode() {
    const type = document.getElementById('invite-code-type').value;
    const expiryDays = parseInt(document.getElementById('invite-code-expiry').value);
    
    if (isNaN(expiryDays) || expiryDays <= 0) {
        alert('请输入有效的有效期天数');
        return;
    }
    
    // 生成随机邀请码
    const code = generateRandomCode(8);
    
    // 计算过期日期
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);
    
    // 创建邀请码对象
    const inviteCode = {
        code: code,
        type: type,
        status: 'active',
        maxUses: 1, // 固定为1次
        usedCount: 0,
        expiryDate: expiryDate.toISOString(),
        created: new Date().toISOString(),
        createdBy: currentAdmin.username
    };
    
    // 保存邀请码
    window.db.saveInviteCode(inviteCode).then(() => {
        alert(`邀请码生成成功: ${code}`);
        loadInviteCodes();
    }).catch(error => {
        console.error('生成邀请码失败:', error);
        alert('生成邀请码失败: ' + error.message);
    });
}

/**
 * 删除邀请码
 * @param {string} code - 要删除的邀请码
 */
function deleteInviteCode(code) {
    window.db.deleteInviteCode(code).then(() => {
        alert('邀请码删除成功');
        loadInviteCodes();
    }).catch(error => {
        console.error('删除邀请码失败:', error);
        alert('删除邀请码失败: ' + error.message);
    });
}

/**
 * 导出邀请码列表
 */
function exportInviteCodes() {
    window.db.getAllInviteCodes().then(inviteCodes => {
        // 创建CSV内容
        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += '邀请码,类型,状态,是否已使用,过期日期,创建日期\n';
        
        inviteCodes.forEach(code => {
            const type = code.type === 'student' ? '学生' : '教师';
            const status = code.status === 'active' ? '有效' : code.status === 'used' ? '已使用' : '已过期';
            const isUsed = code.usedCount > 0 ? '是' : '否';
            const expiryDate = new Date(code.expiryDate).toLocaleDateString();
            const createdDate = new Date(code.created).toLocaleDateString();
            
            csvContent += `${code.code},${type},${status},${isUsed},${expiryDate},${createdDate}\n`;
        });
        
        // 创建下载链接
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `邀请码列表_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        
        // 触发下载
        link.click();
        
        // 移除链接
        document.body.removeChild(link);
    }).catch(error => {
        console.error('导出邀请码失败:', error);
        alert('导出邀请码失败: ' + error.message);
    });
}

/**
 * 生成随机邀请码
 * @param {number} length - 邀请码长度
 * @returns {string} - 生成的邀请码
 */
function generateRandomCode(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
}

// 导出函数供其他模块使用
window.admin = {
    isAdminLoggedIn: () => !!currentAdmin
}; 