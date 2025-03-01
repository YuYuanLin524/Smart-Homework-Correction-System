/**
 * 智能作业批改系统 - 主要JavaScript文件
 * 负责页面初始化和全局功能
 */

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 初始化导航
    initNavigation();
    
    // 检查是否有历史记录
    checkHistory();
    
    // 初始化演示模式
    initDemoMode();
});

/**
 * 初始化导航功能
 */
function initNavigation() {
    const navLinks = document.querySelectorAll('nav ul li a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 移除所有active类
            navLinks.forEach(item => {
                item.parentElement.classList.remove('active');
            });
            
            // 添加active类到当前点击的链接
            this.parentElement.classList.add('active');
            
            // 获取目标部分的ID
            const targetId = this.getAttribute('href').substring(1);
            
            // 如果是首页，显示上传部分，隐藏其他部分
            if (!targetId || targetId === '') {
                showSection('upload-section');
                hideSection('history');
                hideSection('recommendations');
                hideSection('about');
                return;
            }
            
            // 隐藏所有主要部分
            hideSection('upload-section');
            hideSection('processing-section');
            hideSection('results-section');
            hideSection('history');
            hideSection('recommendations');
            hideSection('about');
            
            // 显示目标部分
            showSection(targetId);
            
            // 如果是推荐部分，检查用户登录状态
            if (targetId === 'recommendations' && window.auth) {
                if (!window.auth.isLoggedIn()) {
                    // 如果未登录，显示登录提示
                    document.getElementById('recommendations').innerHTML = `
                        <h3>个性化学习推荐</h3>
                        <div class="recommendations-container">
                            <div class="login-prompt">
                                <p>请先登录以查看个性化学习推荐</p>
                                <button class="login-btn" id="recommendations-login-btn">登录</button>
                            </div>
                        </div>
                    `;
                    
                    // 添加登录按钮点击事件
                    document.getElementById('recommendations-login-btn').addEventListener('click', function() {
                        document.getElementById('login-btn').click();
                    });
                }
            }
        });
    });
}

/**
 * 显示指定部分
 * @param {string} sectionId - 要显示的部分的ID
 */
function showSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
    }
}

/**
 * 隐藏指定部分
 * @param {string} sectionId - 要隐藏的部分的ID
 */
function hideSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'none';
    }
}

/**
 * 检查是否有历史记录
 * 如果有，则加载历史记录
 */
function checkHistory() {
    // 从localStorage获取历史记录
    const history = JSON.parse(localStorage.getItem('homework-history')) || [];
    
    // 如果有历史记录，则显示历史记录部分
    if (history.length > 0) {
        loadHistoryItems(history);
    }
}

/**
 * 加载历史记录项目
 * @param {Array} historyItems - 历史记录项目数组
 */
function loadHistoryItems(historyItems) {
    const historyList = document.getElementById('history-list');
    
    // 清空历史记录列表
    historyList.innerHTML = '';
    
    // 添加历史记录项目
    historyItems.forEach((item, index) => {
        const historyItem = createHistoryItem(item, index);
        historyList.appendChild(historyItem);
    });
}

/**
 * 创建历史记录项目元素
 * @param {Object} item - 历史记录项目数据
 * @param {number} index - 项目索引
 * @returns {HTMLElement} - 历史记录项目元素
 */
function createHistoryItem(item, index) {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    
    const date = new Date(item.date);
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    
    // 根据数据类型创建不同的缩略图
    let thumbnailHtml;
    if (item.dataType === 'image') {
        thumbnailHtml = `<div class="history-thumbnail">
            <img src="${item.imageUrl}" alt="作业缩略图">
        </div>`;
    } else {
        thumbnailHtml = `<div class="history-thumbnail text-thumbnail">
            <div class="text-preview-short">${item.textContent.substring(0, 100)}${item.textContent.length > 100 ? '...' : ''}</div>
        </div>`;
    }
    
    historyItem.innerHTML = `
        <div class="history-item-header">
            <div class="history-date">${formattedDate}</div>
            <div class="history-score">${item.score}分</div>
        </div>
        ${thumbnailHtml}
        <div class="history-title">作业 #${index + 1} (${item.dataType === 'image' ? '图片' : '文本'})</div>
        <div class="history-summary">${item.comment}</div>
        <button class="view-details-btn" data-index="${index}">查看详情</button>
    `;
    
    // 添加查看详情按钮点击事件
    const viewDetailsBtn = historyItem.querySelector('.view-details-btn');
    viewDetailsBtn.addEventListener('click', function() {
        const index = this.getAttribute('data-index');
        showHistoryDetails(index);
    });
    
    return historyItem;
}

/**
 * 显示历史记录详情
 * @param {number} index - 历史记录索引
 */
function showHistoryDetails(index) {
    // 从localStorage获取历史记录
    const history = JSON.parse(localStorage.getItem('homework-history')) || [];
    
    if (history[index]) {
        const item = history[index];
        
        // 设置结果部分的内容
        document.getElementById('score').textContent = item.score;
        
        // 根据数据类型设置预览
        if (item.dataType === 'image') {
            // 显示图片容器，隐藏文本容器
            document.getElementById('results-image-container').style.display = 'block';
            document.getElementById('results-text-container').style.display = 'none';
            
            // 设置图片
            document.getElementById('result-image').src = item.imageUrl;
        } else {
            // 显示文本容器，隐藏图片容器
            document.getElementById('results-image-container').style.display = 'none';
            document.getElementById('results-text-container').style.display = 'block';
            
            // 设置文本内容
            document.getElementById('result-text').textContent = item.textContent;
        }
        
        document.getElementById('overall-comment').textContent = item.comment;
        
        // 设置具体问题
        const specificIssuesList = document.getElementById('specific-issues');
        specificIssuesList.innerHTML = '';
        
        if (item.issues && item.issues.length > 0) {
            item.issues.forEach(issue => {
                const li = document.createElement('li');
                li.textContent = issue;
                specificIssuesList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = '没有发现具体问题';
            specificIssuesList.appendChild(li);
        }
        
        // 设置改进建议
        document.getElementById('improvement-suggestions').textContent = item.suggestions || '继续保持良好的学习习惯';
        
        // 隐藏其他部分，显示结果部分
        hideSection('upload-section');
        hideSection('processing-section');
        hideSection('history');
        hideSection('recommendations');
        hideSection('about');
        showSection('results-section');
        
        // 更新导航激活状态
        const navLinks = document.querySelectorAll('nav ul li a');
        navLinks.forEach(link => {
            link.parentElement.classList.remove('active');
        });
        navLinks[0].parentElement.classList.add('active');
    }
}

/**
 * 保存历史记录
 * @param {Object} result - 批改结果
 */
function saveHistory(result) {
    // 从localStorage获取历史记录
    const history = JSON.parse(localStorage.getItem('homework-history')) || [];
    
    // 添加新的历史记录
    const historyItem = {
        date: new Date().toISOString(),
        score: result.score,
        comment: result.comment,
        issues: result.issues,
        suggestions: result.suggestions,
        dataType: result.dataType
    };
    
    // 根据数据类型保存不同的内容
    if (result.dataType === 'image') {
        historyItem.imageUrl = result.imageUrl;
    } else {
        historyItem.textContent = result.textContent;
    }
    
    history.unshift(historyItem);
    
    // 限制历史记录数量为10条
    if (history.length > 10) {
        history.pop();
    }
    
    // 保存到localStorage
    localStorage.setItem('homework-history', JSON.stringify(history));
}

/**
 * 初始化演示模式
 */
function initDemoMode() {
    const demoModeToggle = document.getElementById('demo-mode-toggle');
    
    // 从localStorage获取演示模式状态
    const isDemoMode = localStorage.getItem('demo-mode') !== 'false';
    
    // 设置开关状态
    demoModeToggle.checked = isDemoMode;
    
    // 保存初始状态
    localStorage.setItem('demo-mode', isDemoMode.toString());
    
    // 监听开关变化
    demoModeToggle.addEventListener('change', function() {
        localStorage.setItem('demo-mode', this.checked.toString());
    });
}

// 导出函数供其他模块使用
window.app = {
    showSection,
    hideSection,
    saveHistory
}; 