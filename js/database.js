/**
 * 智能作业批改系统 - 数据库管理
 * 负责IndexedDB数据库的初始化、用户管理和批改记录存储
 */

// 数据库对象
let db;

// 数据库名称和版本
const DB_NAME = 'HomeworkCorrectionDB';
const DB_VERSION = 1;

// 存储对象名称
const STORES = {
    USERS: 'users',
    CORRECTIONS: 'corrections',
    ERROR_TYPES: 'errorTypes',
    INVITE_CODES: 'inviteCodes',
    CLASSES: 'classes'
};

/**
 * 初始化数据库
 * @returns {Promise} - 数据库初始化完成的Promise
 */
function initDatabase() {
    return new Promise((resolve, reject) => {
        // 打开数据库
        console.log('开始初始化数据库，当前版本:', DB_VERSION);
        const request = indexedDB.open(DB_NAME, 2); // 固定使用版本2，确保执行升级
        
        // 数据库升级事件（首次创建或版本升级时触发）
        request.onupgradeneeded = function(event) {
            console.log('数据库需要升级, 旧版本:', event.oldVersion, '新版本:', event.newVersion);
            db = event.target.result;
            
            // 创建用户存储对象
            if (!db.objectStoreNames.contains(STORES.USERS)) {
                console.log('创建用户存储对象');
                const usersStore = db.createObjectStore(STORES.USERS, { keyPath: 'id' });
                usersStore.createIndex('by_name', 'name', { unique: false });
                usersStore.createIndex('by_name_role', ['name', 'role'], { unique: true });
                usersStore.createIndex('by_student_id', 'studentId', { unique: true, multiEntry: false });
                usersStore.createIndex('by_teacher_id', 'teacherId', { unique: true, multiEntry: false });
            } else {
                console.log('用户存储对象已存在');
                // 如果存储对象已存在但需要添加新索引
                const transaction = event.target.transaction;
                const usersStore = transaction.objectStore(STORES.USERS);
                
                // 检查并添加新索引
                if (!usersStore.indexNames.contains('by_name')) {
                    usersStore.createIndex('by_name', 'name', { unique: false });
                }
                if (!usersStore.indexNames.contains('by_name_role')) {
                    usersStore.createIndex('by_name_role', ['name', 'role'], { unique: true });
                }
                if (!usersStore.indexNames.contains('by_student_id')) {
                    usersStore.createIndex('by_student_id', 'studentId', { unique: true, multiEntry: false });
                }
                if (!usersStore.indexNames.contains('by_teacher_id')) {
                    usersStore.createIndex('by_teacher_id', 'teacherId', { unique: true, multiEntry: false });
                }
            }
            
            // 创建批改记录存储对象
            if (!db.objectStoreNames.contains(STORES.CORRECTIONS)) {
                console.log('创建批改记录存储对象');
                const correctionsStore = db.createObjectStore(STORES.CORRECTIONS, { keyPath: 'id', autoIncrement: true });
                correctionsStore.createIndex('username', 'username', { unique: false });
                correctionsStore.createIndex('date', 'date', { unique: false });
                correctionsStore.createIndex('subject', 'subject', { unique: false });
            }
            
            // 创建错误类型存储对象
            if (!db.objectStoreNames.contains(STORES.ERROR_TYPES)) {
                console.log('创建错误类型存储对象');
                const errorTypesStore = db.createObjectStore(STORES.ERROR_TYPES, { keyPath: 'id', autoIncrement: true });
                errorTypesStore.createIndex('username', 'username', { unique: false });
                errorTypesStore.createIndex('type', 'type', { unique: false });
                errorTypesStore.createIndex('count', 'count', { unique: false });
            }
            
            // 创建邀请码存储对象
            if (!db.objectStoreNames.contains(STORES.INVITE_CODES)) {
                console.log('创建邀请码存储对象');
                const inviteCodesStore = db.createObjectStore(STORES.INVITE_CODES, { keyPath: 'code' });
                inviteCodesStore.createIndex('type', 'type', { unique: false });
                inviteCodesStore.createIndex('status', 'status', { unique: false });
                inviteCodesStore.createIndex('expiryDate', 'expiryDate', { unique: false });
                
                // 添加默认邀请码
                const defaultCodes = [
                    {
                        code: 'STUDENT2023',
                        type: 'student',
                        status: 'active',
                        maxUses: 100,
                        usedCount: 0,
                        expiryDate: new Date(2025, 11, 31).toISOString(),
                        created: new Date().toISOString(),
                        createdBy: 'system'
                    },
                    {
                        code: 'TEACHER2023',
                        type: 'teacher',
                        status: 'active',
                        maxUses: 20,
                        usedCount: 0,
                        expiryDate: new Date(2025, 11, 31).toISOString(),
                        created: new Date().toISOString(),
                        createdBy: 'system'
                    }
                ];
                
                // 使用事务直接添加默认邀请码
                const transaction = event.target.transaction;
                const store = transaction.objectStore(STORES.INVITE_CODES);
                
                defaultCodes.forEach(code => {
                    console.log('添加默认邀请码:', code.code, '类型:', code.type);
                    store.add(code);
                });
            }
            
            // 创建班级存储对象
            if (!db.objectStoreNames.contains(STORES.CLASSES)) {
                console.log('创建班级存储对象');
                const classesStore = db.createObjectStore(STORES.CLASSES, {
                    keyPath: 'classId',
                    autoIncrement: true
                });
                classesStore.createIndex('by_grade', 'grade', { unique: false });
                classesStore.createIndex('by_teacher', 'headTeacher', { unique: false });
            }
        };
        
        // 数据库打开成功
        request.onsuccess = function(event) {
            db = event.target.result;
            console.log('数据库初始化成功，当前版本:', db.version);
            
            // 验证邀请码是否存在
            checkInviteCodes().then(() => {
                resolve(db);
            }).catch(error => {
                console.error('验证邀请码失败:', error);
                reject(error);
            });
        };
        
        // 数据库打开失败
        request.onerror = function(event) {
            console.error('数据库初始化失败:', event.target.error);
            reject(event.target.error);
        };
        
        // 数据库被阻塞
        request.onblocked = function(event) {
            console.error('数据库被阻塞:', event);
            alert('请关闭其他标签页后重试');
            reject(new Error('数据库被阻塞'));
        };
    });
}

/**
 * 检查邀请码是否存在
 * @returns {Promise} - 检查结果的Promise
 */
function checkInviteCodes() {
    return new Promise((resolve, reject) => {
        // 如果数据库未初始化，则返回错误
        if (!db) {
            reject(new Error('数据库未初始化'));
            return;
        }
        
        try {
            // 创建事务
            const transaction = db.transaction([STORES.INVITE_CODES], 'readonly');
            const inviteCodesStore = transaction.objectStore(STORES.INVITE_CODES);
            
            // 获取所有邀请码
            const request = inviteCodesStore.getAll();
            
            request.onsuccess = function(event) {
                const inviteCodes = event.target.result;
                console.log('当前邀请码数量:', inviteCodes.length);
                
                if (inviteCodes.length === 0) {
                    console.warn('未找到任何邀请码，将添加默认邀请码');
                    addDefaultInviteCodes().then(resolve).catch(reject);
                } else {
                    console.log('邀请码检查完成:', inviteCodes.map(code => code.code).join(', '));
                    resolve();
                }
            };
            
            request.onerror = function(event) {
                console.error('获取邀请码失败:', event.target.error);
                reject(event.target.error);
            };
        } catch (error) {
            console.error('检查邀请码时出错:', error);
            reject(error);
        }
    });
}

/**
 * 添加默认邀请码
 * @returns {Promise} - 添加结果的Promise
 */
function addDefaultInviteCodes() {
    return new Promise((resolve, reject) => {
        try {
            // 创建事务
            const transaction = db.transaction([STORES.INVITE_CODES], 'readwrite');
            const inviteCodesStore = transaction.objectStore(STORES.INVITE_CODES);
            
            // 默认邀请码
            const defaultCodes = [
                {
                    code: 'STUDENT2023',
                    type: 'student',
                    status: 'active',
                    maxUses: 100,
                    usedCount: 0,
                    expiryDate: new Date(2025, 11, 31).toISOString(),
                    created: new Date().toISOString(),
                    createdBy: 'system'
                },
                {
                    code: 'TEACHER2023',
                    type: 'teacher',
                    status: 'active',
                    maxUses: 20,
                    usedCount: 0,
                    expiryDate: new Date(2025, 11, 31).toISOString(),
                    created: new Date().toISOString(),
                    createdBy: 'system'
                }
            ];
            
            // 添加默认邀请码
            let completed = 0;
            defaultCodes.forEach(code => {
                console.log('手动添加默认邀请码:', code.code);
                const request = inviteCodesStore.add(code);
                
                request.onsuccess = function() {
                    completed++;
                    if (completed === defaultCodes.length) {
                        console.log('默认邀请码添加完成');
                        resolve();
                    }
                };
                
                request.onerror = function(event) {
                    console.error('添加默认邀请码失败:', code.code, event.target.error);
                    // 继续添加其他邀请码，不中断流程
                    completed++;
                    if (completed === defaultCodes.length) {
                        resolve();
                    }
                };
            });
            
            // 事务完成
            transaction.oncomplete = function() {
                console.log('添加默认邀请码事务完成');
            };
            
            // 事务失败
            transaction.onerror = function(event) {
                console.error('添加默认邀请码事务失败:', event.target.error);
                reject(event.target.error);
            };
        } catch (error) {
            console.error('添加默认邀请码时出错:', error);
            reject(error);
        }
    });
}

/**
 * 注册新用户
 * @param {Object} user - 用户信息
 * @returns {Promise} - 注册结果的Promise
 */
function registerUser(user) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.USERS], 'readwrite');
        const usersStore = transaction.objectStore(STORES.USERS);
        
        // 检查用户名是否已存在
        const checkRequest = usersStore.get(user.username);
        
        checkRequest.onsuccess = function(event) {
            if (event.target.result) {
                reject(new Error('用户名已存在'));
                return;
            }
            
            // 添加新用户
            const addRequest = usersStore.add(user);
            
            addRequest.onsuccess = function() {
                resolve(user);
            };
            
            addRequest.onerror = function(event) {
                reject(event.target.error);
            };
        };
        
        checkRequest.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

/**
 * 用户登录
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Promise} - 登录结果的Promise
 */
function loginUser(username, password) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.USERS], 'readonly');
        const usersStore = transaction.objectStore(STORES.USERS);
        
        const request = usersStore.get(username);
        
        request.onsuccess = function(event) {
            const user = event.target.result;
            
            if (!user) {
                reject(new Error('用户不存在'));
                return;
            }
            
            if (user.password !== password) {
                reject(new Error('密码错误'));
                return;
            }
            
            resolve(user);
        };
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

/**
 * 保存批改记录
 * @param {Object} correction - 批改记录
 * @returns {Promise} - 保存结果的Promise
 */
function saveCorrectionRecord(correction) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.CORRECTIONS], 'readwrite');
        const correctionsStore = transaction.objectStore(STORES.CORRECTIONS);
        
        const request = correctionsStore.add(correction);
        
        request.onsuccess = function(event) {
            // 获取自动生成的ID
            const id = event.target.result;
            correction.id = id;
            
            // 处理错误类型统计
            processErrorTypes(correction).then(() => {
                resolve(correction);
            }).catch(error => {
                reject(error);
            });
        };
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

/**
 * 处理错误类型统计
 * @param {Object} correction - 批改记录
 * @returns {Promise} - 处理结果的Promise
 */
function processErrorTypes(correction) {
    return new Promise((resolve, reject) => {
        // 从批改记录中提取错误类型
        const errorTypes = extractErrorTypes(correction);
        
        if (errorTypes.length === 0) {
            resolve();
            return;
        }
        
        const transaction = db.transaction([STORES.ERROR_TYPES], 'readwrite');
        const errorTypesStore = transaction.objectStore(STORES.ERROR_TYPES);
        const usernameIndex = errorTypesStore.index('username');
        
        // 获取用户的所有错误类型记录
        const request = usernameIndex.getAll(correction.username);
        
        request.onsuccess = function(event) {
            const existingErrorTypes = event.target.result;
            const promises = [];
            
            // 更新错误类型统计
            errorTypes.forEach(errorType => {
                const existing = existingErrorTypes.find(item => item.type === errorType.type);
                
                if (existing) {
                    // 更新现有记录
                    existing.count += errorType.count;
                    existing.lastUpdated = new Date().toISOString();
                    
                    const updateRequest = errorTypesStore.put(existing);
                    promises.push(new Promise((resolve, reject) => {
                        updateRequest.onsuccess = resolve;
                        updateRequest.onerror = reject;
                    }));
                } else {
                    // 添加新记录
                    const newErrorType = {
                        username: correction.username,
                        type: errorType.type,
                        count: errorType.count,
                        subject: correction.subject,
                        created: new Date().toISOString(),
                        lastUpdated: new Date().toISOString()
                    };
                    
                    const addRequest = errorTypesStore.add(newErrorType);
                    promises.push(new Promise((resolve, reject) => {
                        addRequest.onsuccess = resolve;
                        addRequest.onerror = reject;
                    }));
                }
            });
            
            // 等待所有操作完成
            Promise.all(promises).then(() => {
                resolve();
            }).catch(error => {
                reject(error);
            });
        };
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

/**
 * 从批改记录中提取错误类型
 * @param {Object} correction - 批改记录
 * @returns {Array} - 错误类型数组
 */
function extractErrorTypes(correction) {
    const errorTypes = [];
    const issues = correction.issues || [];
    
    // 根据学科不同，提取不同的错误类型
    if (correction.subject === 'math') {
        // 数学科目错误类型
        const calculationErrors = issues.filter(issue => 
            issue.includes('计算') || 
            issue.includes('运算') || 
            issue.includes('答案')
        ).length;
        
        const conceptErrors = issues.filter(issue => 
            issue.includes('概念') || 
            issue.includes('理解') || 
            issue.includes('思路')
        ).length;
        
        const formulaErrors = issues.filter(issue => 
            issue.includes('公式') || 
            issue.includes('定理') || 
            issue.includes('法则')
        ).length;
        
        if (calculationErrors > 0) {
            errorTypes.push({ type: '计算错误', count: calculationErrors });
        }
        
        if (conceptErrors > 0) {
            errorTypes.push({ type: '概念理解错误', count: conceptErrors });
        }
        
        if (formulaErrors > 0) {
            errorTypes.push({ type: '公式应用错误', count: formulaErrors });
        }
    } else if (correction.subject === 'chinese' || correction.subject === 'english') {
        // 语文/英语科目错误类型
        const grammarErrors = issues.filter(issue => 
            issue.includes('语法') || 
            issue.includes('句子') || 
            issue.includes('结构')
        ).length;
        
        const vocabularyErrors = issues.filter(issue => 
            issue.includes('词汇') || 
            issue.includes('用词') || 
            issue.includes('词语')
        ).length;
        
        const expressionErrors = issues.filter(issue => 
            issue.includes('表达') || 
            issue.includes('逻辑') || 
            issue.includes('连贯')
        ).length;
        
        if (grammarErrors > 0) {
            errorTypes.push({ type: '语法错误', count: grammarErrors });
        }
        
        if (vocabularyErrors > 0) {
            errorTypes.push({ type: '词汇错误', count: vocabularyErrors });
        }
        
        if (expressionErrors > 0) {
            errorTypes.push({ type: '表达错误', count: expressionErrors });
        }
    }
    
    // 如果没有匹配到具体类型，添加一个通用错误类型
    if (errorTypes.length === 0 && issues.length > 0) {
        errorTypes.push({ type: '其他错误', count: issues.length });
    }
    
    return errorTypes;
}

/**
 * 获取用户的批改记录
 * @param {string} username - 用户名
 * @returns {Promise} - 批改记录的Promise
 */
function getUserCorrectionRecords(username) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.CORRECTIONS], 'readonly');
        const correctionsStore = transaction.objectStore(STORES.CORRECTIONS);
        const usernameIndex = correctionsStore.index('username');
        
        const request = usernameIndex.getAll(username);
        
        request.onsuccess = function(event) {
            resolve(event.target.result);
        };
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

/**
 * 获取用户的错误类型统计
 * @param {string} username - 用户名
 * @returns {Promise} - 错误类型统计的Promise
 */
function getUserErrorTypes(username) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.ERROR_TYPES], 'readonly');
        const errorTypesStore = transaction.objectStore(STORES.ERROR_TYPES);
        const usernameIndex = errorTypesStore.index('username');
        
        const request = usernameIndex.getAll(username);
        
        request.onsuccess = function(event) {
            resolve(event.target.result);
        };
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

/**
 * 根据错误类型生成推荐练习
 * @param {Array} errorTypes - 错误类型统计
 * @returns {Array} - 推荐练习数组
 */
function generateRecommendations(errorTypes) {
    // 按错误次数排序
    const sortedErrorTypes = [...errorTypes].sort((a, b) => b.count - a.count);
    
    // 生成推荐练习
    const recommendations = [];
    
    sortedErrorTypes.forEach(errorType => {
        let recommendation = {
            type: errorType.type,
            count: errorType.count,
            subject: errorType.subject
        };
        
        // 根据错误类型生成不同的推荐
        switch (errorType.type) {
            case '计算错误':
                recommendation.title = '基础计算能力训练';
                recommendation.description = '针对性练习各种数学计算技巧，提高计算准确性。';
                recommendation.exercises = [
                    '分数四则运算专项练习',
                    '小数点位置计算练习',
                    '多步骤计算题集'
                ];
                break;
                
            case '概念理解错误':
                recommendation.title = '数学概念强化训练';
                recommendation.description = '通过图解和实例帮助理解抽象数学概念。';
                recommendation.exercises = [
                    '几何概念可视化练习',
                    '代数概念应用题',
                    '数学术语理解练习'
                ];
                break;
                
            case '公式应用错误':
                recommendation.title = '公式应用专项训练';
                recommendation.description = '学习如何在不同情境下正确选择和应用数学公式。';
                recommendation.exercises = [
                    '常用公式记忆与应用',
                    '公式变形练习',
                    '综合应用题集'
                ];
                break;
                
            case '语法错误':
                recommendation.title = '语法规则专项训练';
                recommendation.description = '系统学习语法规则，提高语言表达的准确性。';
                recommendation.exercises = [
                    '句子成分分析练习',
                    '常见语法错误纠正',
                    '复杂句型构建练习'
                ];
                break;
                
            case '词汇错误':
                recommendation.title = '词汇积累与应用';
                recommendation.description = '扩充词汇量，学习词语的正确用法。';
                recommendation.exercises = [
                    '近义词辨析练习',
                    '常用词语搭配训练',
                    '成语应用专项练习'
                ];
                break;
                
            case '表达错误':
                recommendation.title = '语言表达能力提升';
                recommendation.description = '提高语言的逻辑性和连贯性，使表达更加清晰。';
                recommendation.exercises = [
                    '段落组织训练',
                    '逻辑连接词使用练习',
                    '主题句与支撑句练习'
                ];
                break;
                
            default:
                recommendation.title = '综合能力提升训练';
                recommendation.description = '全面提升学科能力，查漏补缺。';
                recommendation.exercises = [
                    '综合练习题集',
                    '常见错误分析与纠正',
                    '解题思路训练'
                ];
        }
        
        recommendations.push(recommendation);
    });
    
    return recommendations;
}

/**
 * 验证邀请码
 * @param {string} code - 邀请码
 * @param {string} type - 用户类型（student或teacher）
 * @returns {Promise} - 验证结果的Promise
 */
function validateInviteCode(code, type) {
    return new Promise((resolve, reject) => {
        console.log('开始验证邀请码:', code, '类型:', type);
        
        // 如果数据库未初始化，则返回错误
        if (!db) {
            console.error('数据库未初始化，无法验证邀请码');
            reject(new Error('数据库未初始化'));
            return;
        }
        
        try {
            // 创建事务
            const transaction = db.transaction([STORES.INVITE_CODES], 'readwrite');
            const inviteCodesStore = transaction.objectStore(STORES.INVITE_CODES);
            
            // 获取邀请码
            const request = inviteCodesStore.get(code);
            
            request.onsuccess = function(event) {
                const inviteCode = event.target.result;
                
                if (!inviteCode) {
                    console.error('邀请码不存在:', code);
                    reject(new Error('邀请码不存在'));
                    return;
                }
                
                console.log('找到邀请码:', inviteCode.code, '状态:', inviteCode.status, '类型:', inviteCode.type);
                
                // 检查邀请码状态
                if (inviteCode.status !== 'active') {
                    console.error('邀请码已失效:', inviteCode.status);
                    reject(new Error('邀请码已失效'));
                    return;
                }
                
                // 检查邀请码类型
                if (inviteCode.type !== type) {
                    console.error('邀请码类型不匹配, 需要:', type, '实际:', inviteCode.type);
                    reject(new Error(`此邀请码仅适用于${inviteCode.type === 'student' ? '学生' : '教师'}注册`));
                    return;
                }
                
                // 检查邀请码有效期
                const expiryDate = new Date(inviteCode.expiryDate);
                if (expiryDate < new Date()) {
                    console.error('邀请码已过期:', inviteCode.expiryDate);
                    // 更新邀请码状态为过期
                    inviteCode.status = 'expired';
                    inviteCodesStore.put(inviteCode);
                    
                    reject(new Error('邀请码已过期'));
                    return;
                }
                
                // 检查是否已使用
                if (inviteCode.usedCount > 0) {
                    console.error('邀请码已被使用');
                    // 确保状态为已使用
                    inviteCode.status = 'used';
                    inviteCodesStore.put(inviteCode);
                    
                    reject(new Error('该邀请码已被使用，请使用新的邀请码'));
                    return;
                }
                
                console.log('邀请码验证成功, 标记为已使用');
                
                // 标记为已使用
                inviteCode.usedCount = 1;
                inviteCode.status = 'used';
                
                // 由于每个邀请码只能使用一次，所以使用后立即更新状态
                
                // 更新邀请码
                const updateRequest = inviteCodesStore.put(inviteCode);
                
                updateRequest.onsuccess = function() {
                    console.log('邀请码使用次数更新成功');
                    resolve(inviteCode);
                };
                
                updateRequest.onerror = function(event) {
                    console.error('更新邀请码使用次数失败:', event.target.error);
                    // 即使更新失败，仍然允许注册
                    resolve(inviteCode);
                };
            };
            
            request.onerror = function(event) {
                console.error('获取邀请码失败:', event.target.error);
                reject(event.target.error);
            };
        } catch (error) {
            console.error('验证邀请码时出错:', error);
            reject(error);
        }
    });
}

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

/**
 * 获取所有邀请码
 * @returns {Promise} - 邀请码数组的Promise
 */
function getAllInviteCodes() {
    return new Promise((resolve, reject) => {
        try {
            // 如果数据库未初始化，则返回错误
            if (!db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            // 创建事务
            const transaction = db.transaction([STORES.INVITE_CODES], 'readonly');
            const inviteCodesStore = transaction.objectStore(STORES.INVITE_CODES);
            
            // 获取所有邀请码
            const request = inviteCodesStore.getAll();
            
            request.onsuccess = function(event) {
                const inviteCodes = event.target.result;
                resolve(inviteCodes);
            };
            
            request.onerror = function(event) {
                console.error('获取邀请码失败:', event.target.error);
                reject(event.target.error);
            };
        } catch (error) {
            console.error('获取邀请码时出错:', error);
            reject(error);
        }
    });
}

/**
 * 保存邀请码
 * @param {Object} inviteCode - 邀请码对象
 * @returns {Promise} - 保存结果的Promise
 */
function saveInviteCode(inviteCode) {
    return new Promise((resolve, reject) => {
        try {
            // 如果数据库未初始化，则返回错误
            if (!db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            // 创建事务
            const transaction = db.transaction([STORES.INVITE_CODES], 'readwrite');
            const inviteCodesStore = transaction.objectStore(STORES.INVITE_CODES);
            
            // 保存邀请码
            const request = inviteCodesStore.put(inviteCode);
            
            request.onsuccess = function() {
                console.log('邀请码保存成功:', inviteCode.code);
                resolve();
            };
            
            request.onerror = function(event) {
                console.error('保存邀请码失败:', event.target.error);
                reject(event.target.error);
            };
        } catch (error) {
            console.error('保存邀请码时出错:', error);
            reject(error);
        }
    });
}

/**
 * 删除邀请码
 * @param {string} code - 邀请码
 * @returns {Promise} - 删除结果的Promise
 */
function deleteInviteCode(code) {
    return new Promise((resolve, reject) => {
        try {
            // 如果数据库未初始化，则返回错误
            if (!db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            // 创建事务
            const transaction = db.transaction([STORES.INVITE_CODES], 'readwrite');
            const inviteCodesStore = transaction.objectStore(STORES.INVITE_CODES);
            
            // 删除邀请码
            const request = inviteCodesStore.delete(code);
            
            request.onsuccess = function() {
                console.log('邀请码删除成功:', code);
                resolve();
            };
            
            request.onerror = function(event) {
                console.error('删除邀请码失败:', event.target.error);
                reject(event.target.error);
            };
        } catch (error) {
            console.error('删除邀请码时出错:', error);
            reject(error);
        }
    });
}

// 新增班级相关函数
function createClass(classData) {
    // 生成班级ID逻辑
    classData.classId = generateClassId(classData);
    return dbOperation(STORES.CLASSES, 'add', classData);
}

function getClassesByGrade(grade) {
    const index = db.getStore(STORES.CLASSES).index('by_grade');
    return index.getAll(grade);
}

// 导出函数供其他模块使用
window.db = {
    init: initDatabase,
    registerUser,
    loginUser,
    saveCorrectionRecord,
    getUserCorrectionRecords,
    getUserErrorTypes,
    generateRecommendations,
    validateInviteCode,
    getAllInviteCodes,
    saveInviteCode,
    deleteInviteCode,
    createClass,
    getClassesByGrade
}; 