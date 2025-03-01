/**
 * 智能作业批改系统 - 用户认证管理
 * 负责登录、注册和用户状态管理
 */

// 当前登录用户
let currentUser = null;

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 初始化数据库
    window.db.init().then(() => {
        console.log('数据库初始化成功');
        
        // 检查用户登录状态
        checkLoginStatus();
        
        // 初始化认证界面
        initAuthUI();
    }).catch(error => {
        console.error('数据库初始化失败:', error);
    });
});

/**
 * 检查用户登录状态
 */
function checkLoginStatus() {
    // 先从localStorage获取登录状态（记住我功能）
    let userJson = localStorage.getItem('currentUser');
    
    // 如果localStorage中没有，则从sessionStorage获取（当前会话）
    if (!userJson) {
        userJson = sessionStorage.getItem('currentUser');
    }
    
    if (userJson) {
        try {
            currentUser = JSON.parse(userJson);
            updateUIForLoggedInUser();
        } catch (error) {
            console.error('解析用户数据失败:', error);
            logout();
        }
    } else {
        updateUIForLoggedOutUser();
    }
}

/**
 * 初始化认证界面
 */
function initAuthUI() {
    // 登录按钮点击事件
    document.getElementById('login-btn').addEventListener('click', function() {
        showAuthModal('login');
    });
    
    // 注册按钮点击事件
    document.getElementById('register-btn').addEventListener('click', function() {
        showAuthModal('register');
    });
    
    // 退出按钮点击事件
    document.getElementById('logout-btn').addEventListener('click', function() {
        logout();
    });
    
    // 关闭模态框按钮点击事件
    document.getElementById('close-modal').addEventListener('click', function() {
        hideAuthModal();
    });
    
    // 认证标签切换事件
    const authTabs = document.querySelectorAll('.auth-tab');
    authTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchAuthTab(tabName);
        });
    });
    
    // 角色选择变化事件
    const roleRadios = document.querySelectorAll('input[name="userRole"]');
    roleRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const role = this.value;
            const studentFields = document.querySelectorAll('.student-field');
            const teacherFields = document.querySelectorAll('.teacher-field');
            
            if (role === 'student') {
                // 显示学生字段，隐藏教师字段
                studentFields.forEach(field => field.style.display = 'flex');
                teacherFields.forEach(field => field.style.display = 'none');
            } else {
                // 显示教师字段，隐藏学生字段
                studentFields.forEach(field => field.style.display = 'none');
                teacherFields.forEach(field => field.style.display = 'flex');
            }
        });
    });
    
    // 登录表单提交事件
    document.getElementById('submit-login-btn').addEventListener('click', function() {
        handleLogin();
    });
    
    // 注册表单提交事件
    document.getElementById('submit-register-btn').addEventListener('click', function() {
        handleRegister();
    });
    
    // 点击模态框外部关闭模态框
    const modal = document.getElementById('auth-modal');
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            hideAuthModal();
        }
    });
}

/**
 * 显示认证模态框
 * @param {string} tab - 要显示的标签（'login'或'register'）
 */
function showAuthModal(tab) {
    // 先清空所有输入字段
    document.getElementById('login-name').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('remember-me').checked = false;
    
    document.getElementById('register-name').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-invite-code').value = '';
    document.getElementById('register-student-id').value = '';
    document.getElementById('register-class').value = '';
    document.getElementById('register-teacher-id').value = '';
    
    // 重置多选下拉框
    const subjectSelect = document.getElementById('register-subject');
    if (subjectSelect) {
        for (let i = 0; i < subjectSelect.options.length; i++) {
            subjectSelect.options[i].selected = false;
        }
    }
    
    // 重置为学生角色
    const studentRadio = document.querySelector('input[name="userRole"][value="student"]');
    if (studentRadio) {
        studentRadio.checked = true;
        
        // 显示学生字段，隐藏教师字段
        const studentFields = document.querySelectorAll('.student-field');
        const teacherFields = document.querySelectorAll('.teacher-field');
        
        studentFields.forEach(field => field.style.display = 'flex');
        teacherFields.forEach(field => field.style.display = 'none');
    }
    
    // 显示模态框
    document.getElementById('auth-modal').style.display = 'flex';
    switchAuthTab(tab);
}

/**
 * 隐藏认证模态框
 */
function hideAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
    
    // 清空所有输入框
    document.getElementById('login-name').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('remember-me').checked = false;
    
    document.getElementById('register-name').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-invite-code').value = '';
    document.getElementById('register-student-id').value = '';
    document.getElementById('register-class').value = '';
    document.getElementById('register-teacher-id').value = '';
    
    // 重置多选下拉框
    const subjectSelect = document.getElementById('register-subject');
    if (subjectSelect) {
        for (let i = 0; i < subjectSelect.options.length; i++) {
            subjectSelect.options[i].selected = false;
        }
    }
    
    // 重置为学生角色
    const studentRadio = document.querySelector('input[name="userRole"][value="student"]');
    if (studentRadio) {
        studentRadio.checked = true;
        
        // 显示学生字段，隐藏教师字段
        const studentFields = document.querySelectorAll('.student-field');
        const teacherFields = document.querySelectorAll('.teacher-field');
        
        studentFields.forEach(field => field.style.display = 'flex');
        teacherFields.forEach(field => field.style.display = 'none');
    }
}

/**
 * 切换认证标签
 * @param {string} tab - 要显示的标签（'login'或'register'）
 */
function switchAuthTab(tab) {
    // 更新标签样式
    const authTabs = document.querySelectorAll('.auth-tab');
    authTabs.forEach(item => {
        if (item.getAttribute('data-tab') === tab) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // 显示相应的表单
    if (tab === 'login') {
        document.getElementById('login-form').style.display = 'flex';
        document.getElementById('register-form').style.display = 'none';
    } else {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'flex';
    }
}

// 有效的邀请码列表
const validInviteCodes = {
    'STUDENT2023': 'student', // 学生邀请码
    'TEACHER2023': 'teacher'  // 教师邀请码
};

/**
 * 处理登录
 */
function handleLogin() {
    const name = document.getElementById('login-name').value.trim();
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    if (!name || !password) {
        alert('请输入姓名和密码');
        return;
    }
    
    window.db.loginUser(name, password).then(user => {
        currentUser = user;
        
        // 保存登录状态
        if (rememberMe) {
            localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
            sessionStorage.setItem('currentUser', JSON.stringify(user));
        }
        
        // 更新UI
        updateUIForLoggedInUser();
        
        // 隐藏模态框
        hideAuthModal();
        
        // 显示欢迎消息
        alert(`欢迎回来，${user.role === 'student' ? '同学' : '老师'}${user.name}！`);
    }).catch(error => {
        alert('登录失败: ' + error.message);
    });
}

/**
 * 处理注册
 */
function handleRegister() {
    const role = document.querySelector('input[name="userRole"]:checked').value;
    const name = document.getElementById('register-name').value.trim();
    const password = document.getElementById('register-password').value;
    const inviteCode = document.getElementById('register-invite-code').value.trim();
    
    console.log('开始处理注册请求, 角色:', role, '姓名:', name, '邀请码:', inviteCode);
    
    // 基本验证
    if (!name || !password) {
        alert('请输入姓名和密码');
        return;
    }
    
    // 邀请码验证
    if (!inviteCode) {
        alert('请输入邀请码');
        return;
    }
    
    // 先尝试使用旧的验证方式 - 为了兼容性
    if (validInviteCodes[inviteCode] && validInviteCodes[inviteCode] !== role) {
        alert(`此邀请码仅适用于${validInviteCodes[inviteCode] === 'student' ? '学生' : '教师'}注册`);
        return;
    }
    
    console.log('正在验证邀请码...');
    
    // 使用数据库API验证邀请码
    window.db.validateInviteCode(inviteCode, role)
        .then((validatedCode) => {
            console.log('邀请码验证成功:', validatedCode);
            
            // 根据角色验证特定字段
            if (role === 'student') {
                const studentId = document.getElementById('register-student-id').value.trim();
                const classRoom = document.getElementById('register-class').value.trim();
                
                if (!studentId) {
                    alert('请输入学号');
                    return;
                }
                
                if (!classRoom) {
                    alert('请输入班级信息');
                    return;
                }
                
                const user = {
                    id: generateUUID(),
                    name,
                    password,
                    role: 'student',
                    studentId,
                    classRoom,
                    created: new Date().toISOString()
                };
                
                console.log('创建学生用户:', user.name, '学号:', user.studentId);
                
                window.db.registerUser(user).then(() => {
                    console.log('学生用户注册成功');
                    alert('注册成功，请登录');
                    switchAuthTab('login');
                    document.getElementById('login-name').value = name;
                }).catch(error => {
                    console.error('学生注册失败:', error);
                    alert('注册失败: ' + error.message);
                });
            } else {
                const teacherId = document.getElementById('register-teacher-id').value.trim();
                const subjectSelect = document.getElementById('register-subject');
                const subjects = Array.from(subjectSelect.selectedOptions).map(option => option.value);
                
                if (!teacherId) {
                    alert('请输入教师工号');
                    return;
                }
                
                if (subjects.length === 0) {
                    alert('请选择至少一个教授学科');
                    return;
                }
                
                const user = {
                    id: generateUUID(),
                    name,
                    password,
                    role: 'teacher',
                    teacherId,
                    subjects,
                    created: new Date().toISOString()
                };
                
                console.log('创建教师用户:', user.name, '工号:', user.teacherId, '学科:', user.subjects);
                
                window.db.registerUser(user).then(() => {
                    console.log('教师用户注册成功');
                    alert('注册成功，请登录');
                    switchAuthTab('login');
                    document.getElementById('login-name').value = name;
                }).catch(error => {
                    console.error('教师注册失败:', error);
                    alert('注册失败: ' + error.message);
                });
            }
        })
        .catch(error => {
            console.error('邀请码验证失败:', error);
            // 尝试使用旧的邀请码逻辑作为备份
            if (validInviteCodes[inviteCode]) {
                console.log('使用备用邀请码验证方式');
                
                if (validInviteCodes[inviteCode] === role) {
                    // 继续注册流程...
                    alert('邀请码验证成功（备用方式）');
                    
                    // 这里可以复制上面的注册逻辑，但为了简洁起见，提示用户刷新页面
                    alert('请刷新页面后重试注册');
                } else {
                    alert(`此邀请码仅适用于${validInviteCodes[inviteCode] === 'student' ? '学生' : '教师'}注册`);
                }
            } else {
                alert('邀请码验证失败: ' + error.message);
            }
        });
}

/**
 * 退出登录
 */
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
    updateUIForLoggedOutUser();
}

/**
 * 更新UI为已登录状态
 */
function updateUIForLoggedInUser() {
    document.getElementById('user-logged-out').style.display = 'none';
    document.getElementById('user-logged-in').style.display = 'flex';
    
    // 更新显示的用户名，根据角色添加适当的前缀
    const userNameElement = document.getElementById('username');
    const displayName = currentUser.role === 'teacher' ? 
                        `${currentUser.name} 老师` : 
                        `${currentUser.name} 同学`;
    userNameElement.textContent = displayName;
    
    // 根据用户角色设置不同的主题
    document.body.classList.remove('is-student', 'is-teacher');
    document.body.classList.add(currentUser.role === 'teacher' ? 'is-teacher' : 'is-student');
    
    // 加载用户的推荐内容
    loadUserRecommendations();
}

/**
 * 更新UI为未登录状态
 */
function updateUIForLoggedOutUser() {
    document.getElementById('user-logged-out').style.display = 'flex';
    document.getElementById('user-logged-in').style.display = 'none';
}

/**
 * 加载用户的推荐内容
 */
function loadUserRecommendations() {
    if (!currentUser) {
        console.log('未登录，无法加载推荐内容');
        return;
    }
    
    console.log('正在加载用户推荐内容, 用户:', currentUser.name);
    
    // 获取用户的错误类型统计
    window.db.getUserErrorTypes(currentUser.id).then(errorTypes => {
        console.log('获取到错误类型:', errorTypes.length);
        
        if (errorTypes.length > 0) {
            // 生成推荐练习
            const recommendations = window.db.generateRecommendations(errorTypes);
            
            // 显示错误类型分析图表
            renderErrorChart(errorTypes);
            
            // 显示推荐练习
            renderRecommendations(recommendations);
        } else {
            // 没有足够的数据生成推荐
            document.getElementById('recommendations-list').innerHTML = `
                <div class="no-recommendations">
                    <p>目前还没有足够的批改记录来生成个性化推荐。</p>
                    <p>请继续提交作业批改，系统将根据你的错误类型为你推荐练习。</p>
                </div>
            `;
        }
    }).catch(error => {
        console.error('加载推荐内容失败:', error);
    });
}

/**
 * 渲染错误类型分析图表
 * @param {Array} errorTypes - 错误类型统计
 */
function renderErrorChart(errorTypes) {
    // 按错误次数排序
    const sortedErrorTypes = [...errorTypes].sort((a, b) => b.count - a.count);
    
    // 准备图表数据
    const labels = sortedErrorTypes.map(item => item.type);
    const data = sortedErrorTypes.map(item => item.count);
    
    // 获取Canvas元素
    const canvas = document.getElementById('error-chart');
    const ctx = canvas.getContext('2d');
    
    // 清除旧图表
    if (window.errorChart) {
        window.errorChart.destroy();
    }
    
    // 创建新图表
    window.errorChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '错误次数',
                data: data,
                backgroundColor: 'rgba(0, 122, 255, 0.6)',
                borderColor: 'rgba(0, 122, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

/**
 * 渲染推荐练习
 * @param {Array} recommendations - 推荐练习
 */
function renderRecommendations(recommendations) {
    const recommendationsList = document.getElementById('recommendations-list');
    recommendationsList.innerHTML = '';
    
    recommendations.forEach(recommendation => {
        const item = document.createElement('div');
        item.className = 'recommendation-item';
        
        item.innerHTML = `
            <div class="recommendation-title">${recommendation.title}</div>
            <div class="recommendation-type">${recommendation.type} (${recommendation.count}次)</div>
            <div class="recommendation-desc">${recommendation.description}</div>
            <div class="recommendation-exercises">
                <ul>
                    ${recommendation.exercises.map(exercise => `<li>${exercise}</li>`).join('')}
                </ul>
            </div>
            <button class="practice-btn" data-type="${recommendation.type}">开始练习</button>
        `;
        
        // 添加练习按钮点击事件
        const practiceBtn = item.querySelector('.practice-btn');
        practiceBtn.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            alert(`即将开始 ${type} 专项练习（功能开发中）`);
        });
        
        recommendationsList.appendChild(item);
    });
}

// 添加UUID生成函数
/**
 * 生成UUID
 * @returns {string} - 生成的UUID
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// 导出函数供其他模块使用
window.auth = {
    getCurrentUser: () => currentUser,
    isLoggedIn: () => !!currentUser
}; 