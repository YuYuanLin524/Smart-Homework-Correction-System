/**
 * 智能作业批改系统 - 上传功能
 * 负责处理图片上传和预览
 */

// 模型配置
const models = {
    'gpt4v': {
        name: 'GPT-4 Vision',
        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
        headers: {
            'Authorization': 'Bearer YOUR_OPENAI_API_KEY',
            'Content-Type': 'application/json'
        },
        preparePayload: (imageBase64) => ({
            model: "gpt-4-vision-preview",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "这是一份学生作业，请帮我批改并给出评分(满分100)、评语和改进建议。请按以下格式返回：\n分数：[分数]\n总体评价：[评语]\n具体问题：\n- [问题1]\n- [问题2]\n改进建议：[建议]" },
                        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
                    ]
                }
            ],
            max_tokens: 1000
        }),
        parseResponse: (data) => {
            const content = data.choices[0].message.content;
            return parseFormattedResponse(content);
        }
    },
    'claude': {
        name: 'Claude 3',
        apiEndpoint: 'https://api.anthropic.com/v1/messages',
        headers: {
            'x-api-key': 'YOUR_ANTHROPIC_API_KEY',
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
        },
        preparePayload: (imageBase64) => ({
            model: "claude-3-opus-20240229",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "这是一份学生作业，请帮我批改并给出评分(满分100)、评语和改进建议。请按以下格式返回：\n分数：[分数]\n总体评价：[评语]\n具体问题：\n- [问题1]\n- [问题2]\n改进建议：[建议]" },
                        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } }
                    ]
                }
            ],
            max_tokens: 1000
        }),
        parseResponse: (data) => {
            const content = data.content[0].text;
            return parseFormattedResponse(content);
        }
    },
    'wenxin': {
        name: '文心一言4.0',
        apiEndpoint: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro',
        headers: {
            'Content-Type': 'application/json'
        },
        preparePayload: (imageBase64) => ({
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "这是一份学生作业，请帮我批改并给出评分(满分100)、评语和改进建议。请按以下格式返回：\n分数：[分数]\n总体评价：[评语]\n具体问题：\n- [问题1]\n- [问题2]\n改进建议：[建议]" },
                        { type: "image", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
                    ]
                }
            ]
        }),
        // 文心一言需要额外的token获取
        getToken: async () => {
            const response = await fetch('https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=YOUR_API_KEY&client_secret=YOUR_SECRET_KEY');
            const data = await response.json();
            return data.access_token;
        },
        parseResponse: (data) => {
            const content = data.result;
            return parseFormattedResponse(content);
        }
    }
};

// 文件类型配置
const fileTypes = {
    'image': {
        accept: 'image/*',
        validate: (file) => file.type.match('image.*'),
        errorMessage: '请上传图片文件！',
        maxSize: 10 * 1024 * 1024, // 10MB
        preview: previewImage,
        process: processImage
    },
    'text': {
        accept: '.docx,.txt',
        validate: (file) => file.name.endsWith('.docx') || file.name.endsWith('.txt') || file.type === 'text/plain' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        errorMessage: '请上传DOCX或TXT文件！',
        maxSize: 5 * 1024 * 1024, // 5MB
        preview: previewText,
        process: processText
    }
};

/**
 * 解析格式化的响应
 * @param {string} content - 模型返回的文本内容
 * @returns {Object} - 解析后的结果对象
 */
function parseFormattedResponse(content) {
    // 提取分数
    const scoreMatch = content.match(/分数：(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 90;
    
    // 提取总体评价
    const commentMatch = content.match(/总体评价：([\s\S]*?)(?=具体问题：|改进建议：|$)/);
    const comment = commentMatch ? commentMatch[1].trim() : "作业完成得不错，有一些小问题需要注意。";
    
    // 提取具体问题
    const issuesMatch = content.match(/具体问题：([\s\S]*?)(?=改进建议：|$)/);
    let issues = [];
    if (issuesMatch) {
        const issuesText = issuesMatch[1].trim();
        issues = issuesText.split('\n').map(line => line.replace(/^-\s*/, '').trim()).filter(line => line);
    }
    
    // 提取改进建议
    const suggestionsMatch = content.match(/改进建议：([\s\S]*?)$/);
    const suggestions = suggestionsMatch ? suggestionsMatch[1].trim() : "建议多加练习，注意细节。";
    
    return {
        score,
        comment,
        issues,
        suggestions
    };
}

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 初始化上传功能
    initUpload();
});

/**
 * 初始化上传功能
 */
function initUpload() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const uploadBtn = document.getElementById('upload-btn');
    const previewContainer = document.getElementById('preview-container');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const textPreviewContainer = document.getElementById('text-preview-container');
    const previewImage = document.getElementById('preview-image');
    const previewText = document.getElementById('preview-text');
    const cancelBtn = document.getElementById('cancel-btn');
    const submitBtn = document.getElementById('submit-btn');
    const newUploadBtn = document.getElementById('new-upload-btn');
    const fileTypeRadios = document.querySelectorAll('input[name="fileType"]');
    
    // 文件类型选择变化时更新文件输入接受的类型
    fileTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const fileType = this.value;
            fileInput.accept = fileTypes[fileType].accept;
        });
    });
    
    // 点击上传按钮触发文件选择
    uploadBtn.addEventListener('click', function(e) {
        // 阻止事件冒泡，防止触发uploadArea的点击事件
        e.stopPropagation();
        fileInput.click();
    });
    
    // 点击上传区域触发文件选择
    uploadArea.addEventListener('click', function(e) {
        // 确保点击的是上传区域本身，而不是其中的按钮
        if (e.target === uploadArea || e.target.closest('.upload-area') && !e.target.closest('.upload-btn')) {
            fileInput.click();
        }
    });
    
    // 文件选择变化时处理上传
    fileInput.addEventListener('change', function(e) {
        handleFileUpload(e.target.files);
    });
    
    // 拖拽事件 - 进入
    uploadArea.addEventListener('dragenter', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('dragover');
    });
    
    // 拖拽事件 - 悬停
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('dragover');
    });
    
    // 拖拽事件 - 离开
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
    });
    
    // 拖拽事件 - 放置
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
        
        // 获取拖拽的文件
        const files = e.dataTransfer.files;
        handleFileUpload(files);
    });
    
    // 取消按钮点击事件
    cancelBtn.addEventListener('click', function() {
        // 清空文件输入
        fileInput.value = '';
        
        // 隐藏预览容器，显示上传区域
        previewContainer.style.display = 'none';
    });
    
    // 提交按钮点击事件
    submitBtn.addEventListener('click', function() {
        // 获取选中的模型和文件类型
        const selectedModel = document.querySelector('input[name="model"]:checked').value;
        const selectedFileType = document.querySelector('input[name="fileType"]:checked').value;
        
        // 显示处理中部分，隐藏上传和预览部分
        window.app.hideSection('upload-section');
        window.app.showSection('processing-section');
        
        // 如果是演示模式，使用模拟处理
        if (localStorage.getItem('demo-mode') === 'true') {
            simulateProcessing();
        } else {
            // 根据文件类型调用相应的处理函数
            if (selectedFileType === 'image') {
                // 获取图片数据
                const imageData = previewImage.src.split(',')[1]; // 获取base64编码的图片数据
                processWithAI(selectedModel, imageData, 'image');
            } else {
                // 获取文本数据
                const textData = previewText.textContent;
                processWithAI(selectedModel, textData, 'text');
            }
        }
    });
    
    // 新上传按钮点击事件
    newUploadBtn.addEventListener('click', function() {
        // 清空文件输入
        fileInput.value = '';
        
        // 隐藏结果部分，显示上传部分
        window.app.hideSection('results-section');
        window.app.showSection('upload-section');
        previewContainer.style.display = 'none';
    });
}

/**
 * 处理文件上传
 * @param {FileList} files - 上传的文件列表
 */
function handleFileUpload(files) {
    if (files.length === 0) return;
    
    const file = files[0];
    const selectedFileType = document.querySelector('input[name="fileType"]:checked').value;
    const fileTypeConfig = fileTypes[selectedFileType];
    
    // 检查文件类型
    if (!fileTypeConfig.validate(file)) {
        alert(fileTypeConfig.errorMessage);
        return;
    }
    
    // 检查文件大小
    if (file.size > fileTypeConfig.maxSize) {
        alert(`文件大小不能超过${fileTypeConfig.maxSize / (1024 * 1024)}MB！`);
        return;
    }
    
    // 根据文件类型调用相应的预览函数
    fileTypeConfig.preview(file);
}

/**
 * 预览图片文件
 * @param {File} file - 图片文件
 */
function previewImage(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const previewImage = document.getElementById('preview-image');
        previewImage.src = e.target.result;
        
        // 显示图片预览，隐藏文本预览
        document.getElementById('image-preview-container').style.display = 'block';
        document.getElementById('text-preview-container').style.display = 'none';
        
        // 显示预览容器
        document.getElementById('preview-container').style.display = 'block';
    };
    
    reader.readAsDataURL(file);
}

/**
 * 预览文本文件
 * @param {File} file - 文本文件
 */
function previewText(file) {
    const previewText = document.getElementById('preview-text');
    const previewContainer = document.getElementById('preview-container');
    
    // 清空预览内容
    previewText.textContent = '';
    
    if (file.name.endsWith('.txt') || file.type === 'text/plain') {
        // 处理TXT文件
        const reader = new FileReader();
        
        reader.onload = function(e) {
            previewText.textContent = e.target.result;
            
            // 显示文本预览，隐藏图片预览
            document.getElementById('image-preview-container').style.display = 'none';
            document.getElementById('text-preview-container').style.display = 'block';
            
            // 显示预览容器
            previewContainer.style.display = 'block';
        };
        
        reader.readAsText(file);
    } else if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // 处理DOCX文件
        previewText.textContent = '正在解析DOCX文件内容...';
        
        // 显示文本预览，隐藏图片预览
        document.getElementById('image-preview-container').style.display = 'none';
        document.getElementById('text-preview-container').style.display = 'block';
        
        // 显示预览容器
        previewContainer.style.display = 'block';
        
        // 使用mammoth.js解析DOCX文件（需要添加mammoth.js库）
        // 由于我们没有实际添加mammoth.js库，这里只显示一个提示
        setTimeout(() => {
            previewText.textContent = `DOCX文件: ${file.name}\n\n[文件内容将在提交后由AI处理]\n\n注意：完整解析DOCX文件需要添加mammoth.js库，当前为演示模式。`;
        }, 1000);
    }
}

/**
 * 处理图片数据
 * @param {File} file - 图片文件
 */
function processImage(file) {
    // 读取文件并显示预览
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const previewImage = document.getElementById('preview-image');
        previewImage.src = e.target.result;
        
        // 显示预览容器
        document.getElementById('preview-container').style.display = 'block';
    };
    
    reader.readAsDataURL(file);
}

/**
 * 处理文本数据
 * @param {File} file - 文本文件
 */
function processText(file) {
    // 这个函数在实际应用中会处理文本文件
    // 目前由previewText函数处理
}

/**
 * 使用AI处理数据
 * @param {string} modelKey - 模型键名
 * @param {string} data - 数据（图片base64或文本）
 * @param {string} dataType - 数据类型（'image'或'text'）
 */
async function processWithAI(modelKey, data, dataType) {
    // 检查是否为演示模式
    const isDemoMode = localStorage.getItem('demo-mode') !== 'false';
    
    if (isDemoMode) {
        return simulateProcessing();
    }
    
    // 实际API调用
    try {
        let apiUrl = 'https://api.deepseek.com/v1/chat/completions';
        let payload;
        
        // DeepSeek R1 模型处理
        if (dataType === 'image') {
            payload = {
                model: "deepseek-r1-vision",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "请批改这份作业，给出分数（满分100分）、总体评价、具体问题和改进建议。" },
                            { type: "image_url", image_url: { url: data } }
                        ]
                    }
                ],
                max_tokens: 1000
            };
        } else {
            payload = {
                model: "deepseek-r1-chat",
                messages: [
                    {
                        role: "user",
                        content: `请批改这份作业，给出分数（满分100分）、总体评价、具体问题和改进建议。\n\n作业内容：\n${data}`
                    }
                ],
                max_tokens: 1000
            };
        }
        
        // 设置请求头
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer YOUR_DEEPSEEK_API_KEY'
        };
        
        // 发送请求
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // 解析响应内容
        const content = result.choices[0].message.content;
        return parseFormattedResponse(content);
    } catch (error) {
        console.error('AI处理失败:', error);
        alert('AI处理失败: ' + error.message);
        return null;
    }
}

/**
 * 为文本数据准备请求体
 * @param {Object} model - 模型配置
 * @param {string} textData - 文本数据
 * @returns {Object} - 请求体
 */
function prepareTextPayload(model, textData) {
    // 根据不同模型准备不同的请求体
    if (model === models.gpt4v) {
        return {
            model: "gpt-4-turbo",
            messages: [
                {
                    role: "user",
                    content: `这是一篇学生作文，请帮我批改并给出评分(满分100)、评语和改进建议。请按以下格式返回：\n分数：[分数]\n总体评价：[评语]\n具体问题：\n- [问题1]\n- [问题2]\n改进建议：[建议]\n\n作文内容：\n${textData}`
                }
            ],
            max_tokens: 1000
        };
    } else if (model === models.claude) {
        return {
            model: "claude-3-opus-20240229",
            messages: [
                {
                    role: "user",
                    content: `这是一篇学生作文，请帮我批改并给出评分(满分100)、评语和改进建议。请按以下格式返回：\n分数：[分数]\n总体评价：[评语]\n具体问题：\n- [问题1]\n- [问题2]\n改进建议：[建议]\n\n作文内容：\n${textData}`
                }
            ],
            max_tokens: 1000
        };
    } else if (model === models.wenxin) {
        return {
            messages: [
                {
                    role: "user",
                    content: `这是一篇学生作文，请帮我批改并给出评分(满分100)、评语和改进建议。请按以下格式返回：\n分数：[分数]\n总体评价：[评语]\n具体问题：\n- [问题1]\n- [问题2]\n改进建议：[建议]\n\n作文内容：\n${textData}`
                }
            ]
        };
    }
    
    // 默认请求体
    return {
        messages: [
            {
                role: "user",
                content: `这是一篇学生作文，请帮我批改并给出评分(满分100)、评语和改进建议。请按以下格式返回：\n分数：[分数]\n总体评价：[评语]\n具体问题：\n- [问题1]\n- [问题2]\n改进建议：[建议]\n\n作文内容：\n${textData}`
            }
        ]
    };
}

/**
 * 显示批改结果
 * @param {Object} result - 批改结果
 */
function displayResult(result) {
    // 设置分数
    document.getElementById('score').textContent = result.score;
    
    // 根据数据类型设置预览
    if (result.dataType === 'image') {
        // 显示图片容器，隐藏文本容器
        document.getElementById('results-image-container').style.display = 'block';
        document.getElementById('results-text-container').style.display = 'none';
        
        // 设置图片
        document.getElementById('result-image').src = result.imageUrl;
    } else {
        // 显示文本容器，隐藏图片容器
        document.getElementById('results-image-container').style.display = 'none';
        document.getElementById('results-text-container').style.display = 'block';
        
        // 设置文本内容
        document.getElementById('result-text').textContent = result.textContent;
    }
    
    // 设置总体评价
    document.getElementById('overall-comment').textContent = result.comment;
    
    // 设置具体问题
    const specificIssuesList = document.getElementById('specific-issues');
    specificIssuesList.innerHTML = '';
    
    result.issues.forEach(issue => {
        const li = document.createElement('li');
        li.textContent = issue;
        specificIssuesList.appendChild(li);
    });
    
    // 设置改进建议
    document.getElementById('improvement-suggestions').textContent = result.suggestions;
    
    // 显示结果部分
    window.app.hideSection('processing-section');
    window.app.showSection('results-section');
    
    // 保存到历史记录
    window.app.saveHistory(result);
    
    // 如果用户已登录，保存批改记录到数据库
    if (window.auth && window.auth.isLoggedIn()) {
        saveCorrectionToDatabase(result);
    }
}

/**
 * 保存批改记录到数据库
 * @param {Object} result - 批改结果
 */
function saveCorrectionToDatabase(result) {
    const currentUser = window.auth.getCurrentUser();
    if (!currentUser) return;
    
    // 确定学科类型
    let subject = 'other';
    const selectedFileType = document.querySelector('input[name="fileType"]:checked').value;
    
    if (selectedFileType === 'image') {
        // 图片类型默认为数学
        subject = 'math';
    } else {
        // 文本类型根据内容判断
        const textContent = result.textContent || '';
        if (textContent.match(/[a-zA-Z]{10,}/)) {
            // 如果包含较多英文单词，判断为英语
            subject = 'english';
        } else {
            // 否则判断为语文
            subject = 'chinese';
        }
    }
    
    // 创建批改记录对象
    const correction = {
        username: currentUser.username,
        date: new Date().toISOString(),
        score: result.score,
        comment: result.comment,
        issues: result.issues,
        suggestions: result.suggestions,
        dataType: result.dataType,
        subject: subject
    };
    
    // 保存到数据库
    window.db.saveCorrectionRecord(correction).then(() => {
        console.log('批改记录已保存到数据库');
        
        // 更新推荐内容
        if (window.auth.loadUserRecommendations) {
            window.auth.loadUserRecommendations();
        }
    }).catch(error => {
        console.error('保存批改记录失败:', error);
    });
}

/**
 * 模拟处理进度
 */
function simulateProcessing() {
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    let progress = 0;
    
    // 获取选中的文件类型
    const selectedFileType = document.querySelector('input[name="fileType"]:checked').value;
    
    // 模拟进度更新
    const interval = setInterval(function() {
        progress += Math.random() * 10;
        
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            
            // 延迟显示结果
            setTimeout(function() {
                // 隐藏处理中部分，显示结果部分
                window.app.hideSection('processing-section');
                window.app.showSection('results-section');
                
                // 生成模拟结果
                let result;
                
                if (selectedFileType === 'image') {
                    // 设置结果图片
                    document.getElementById('result-image').src = document.getElementById('preview-image').src;
                    result = generateMockImageResult();
                } else {
                    // 设置结果文本
                    const textContent = document.getElementById('preview-text').textContent;
                    document.getElementById('result-text').textContent = textContent;
                    result = generateMockTextResult(textContent);
                }
                
                // 保存到历史记录
                window.app.saveHistory(result);
            }, 500);
        }
        
        // 更新进度条和文本
        progressBar.style.width = progress + '%';
        progressText.textContent = Math.round(progress) + '%';
    }, 300);
}

/**
 * 生成模拟图片批改结果
 * @returns {Object} - 模拟批改结果
 */
function generateMockImageResult() {
    // 随机分数（85-98之间）
    const score = Math.floor(Math.random() * 14) + 85;
    
    // 根据分数生成评语
    let comment, issues, suggestions;
    
    if (score >= 95) {
        comment = '这份作业完成得非常出色，思路清晰，解题方法正确，书写工整。';
        issues = [
            '第3题：计算过程正确，但最终答案有小错误',
        ];
        suggestions = '继续保持良好的学习习惯，可以尝试更具挑战性的题目。';
    } else if (score >= 90) {
        comment = '这份作业完成得很好，思路清晰，解题方法正确。有几处小错误需要注意。';
        issues = [
            '第2题：计算过程正确，但最终答案有小错误',
            '第4题：解题思路正确，但公式应用有误'
        ];
        suggestions = '建议复习一下分数乘法的计算规则，注意验算最终答案。';
    } else {
        comment = '这份作业基本完成，但存在一些问题需要改进。';
        issues = [
            '第1题：解题思路有误，需要重新理解题目要求',
            '第3题：计算过程有错误，导致最终答案不正确',
            '第5题：公式使用不正确，建议复习相关知识点'
        ];
        suggestions = '建议重新复习相关知识点，特别是公式的应用和计算技巧。';
    }
    
    // 设置结果内容
    document.getElementById('score').textContent = score;
    document.getElementById('overall-comment').textContent = comment;
    
    // 设置具体问题
    const specificIssuesList = document.getElementById('specific-issues');
    specificIssuesList.innerHTML = '';
    
    issues.forEach(issue => {
        const li = document.createElement('li');
        li.textContent = issue;
        specificIssuesList.appendChild(li);
    });
    
    // 设置改进建议
    document.getElementById('improvement-suggestions').textContent = suggestions;
    
    // 显示图片容器，隐藏文本容器
    document.getElementById('results-image-container').style.display = 'block';
    document.getElementById('results-text-container').style.display = 'none';
    
    return {
        imageUrl: document.getElementById('preview-image').src,
        score: score,
        comment: comment,
        issues: issues,
        suggestions: suggestions,
        dataType: 'image'
    };
}

/**
 * 生成模拟文本批改结果
 * @param {string} textContent - 文本内容
 * @returns {Object} - 模拟批改结果
 */
function generateMockTextResult(textContent) {
    // 随机分数（80-95之间）
    const score = Math.floor(Math.random() * 16) + 80;
    
    // 根据分数生成评语
    let comment, issues, suggestions;
    
    if (score >= 90) {
        comment = '这篇作文写得非常好，结构清晰，语言流畅，观点明确。';
        issues = [
            '个别句子表达不够简洁，可以进一步精炼',
            '部分论据可以更加具体'
        ];
        suggestions = '建议在遣词造句上更加注重精准性，同时可以增加一些生活实例来支持论点。';
    } else if (score >= 85) {
        comment = '这篇作文整体不错，有清晰的主题和结构，但存在一些需要改进的地方。';
        issues = [
            '开头部分引入主题不够自然',
            '部分段落之间的过渡不够流畅',
            '结尾部分略显仓促，没有很好地总结全文'
        ];
        suggestions = '建议加强段落之间的连贯性，注意开头和结尾的写作技巧，使文章更加完整。';
    } else {
        comment = '这篇作文有一定的基础，但存在较多问题需要改进。';
        issues = [
            '主题不够明确，文章缺乏中心思想',
            '段落组织混乱，逻辑不够清晰',
            '语言表达较为单调，缺乏变化',
            '错别字和语法错误较多'
        ];
        suggestions = '建议重新梳理文章结构，明确中心思想，注意语言的多样性和准确性，多阅读优秀范文来提高写作水平。';
    }
    
    // 设置结果内容
    document.getElementById('score').textContent = score;
    document.getElementById('overall-comment').textContent = comment;
    
    // 设置具体问题
    const specificIssuesList = document.getElementById('specific-issues');
    specificIssuesList.innerHTML = '';
    
    issues.forEach(issue => {
        const li = document.createElement('li');
        li.textContent = issue;
        specificIssuesList.appendChild(li);
    });
    
    // 设置改进建议
    document.getElementById('improvement-suggestions').textContent = suggestions;
    
    // 显示文本容器，隐藏图片容器
    document.getElementById('results-image-container').style.display = 'none';
    document.getElementById('results-text-container').style.display = 'block';
    
    return {
        textContent: textContent,
        score: score,
        comment: comment,
        issues: issues,
        suggestions: suggestions,
        dataType: 'text'
    };
} 