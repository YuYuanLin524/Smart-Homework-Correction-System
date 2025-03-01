// DOM 元素
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const previewSection = document.getElementById('previewSection');
const previewContent = document.getElementById('previewContent');
const resultSection = document.getElementById('resultSection');
const scoreDisplay = document.getElementById('scoreDisplay').querySelector('.score-number');
const feedbackContent = document.getElementById('feedbackContent');
const loadingIndicator = document.getElementById('loadingIndicator');

// OpenAI API 配置
const OPENAI_API_KEY = ''; // 需要在这里填入你的 OpenAI API 密钥

// 事件监听器
uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
dropZone.addEventListener('dragover', handleDragOver);
dropZone.addEventListener('drop', handleDrop);

// 处理文件拖放
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.style.borderColor = 'var(--primary-color)';
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.style.borderColor = '#c7c7cc';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

// 处理文件选择
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// 处理文件
function handleFile(file) {
    if (file.type !== 'text/plain') {
        alert('请上传txt格式的文本文件！');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const content = e.target.result;
        showPreview(content);
        await analyzeHomework(content);
    };
    reader.readAsText(file);
}

// 显示预览
function showPreview(content) {
    previewContent.textContent = content;
    previewSection.style.display = 'block';
}

// 分析作业
async function analyzeHomework(content) {
    if (!OPENAI_API_KEY) {
        alert('请先配置OpenAI API密钥！');
        return;
    }

    loadingIndicator.style.display = 'flex';

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "你是一位经验丰富的老师，负责批改学生作业。请对提供的作业内容进行评分（0-100分）并给出详细的反馈意见。"
                    },
                    {
                        role: "user",
                        content: content
                    }
                ]
            })
        });

        const data = await response.json();
        const result = data.choices[0].message.content;
        
        // 解析评分和反馈
        const scoreMatch = result.match(/(\d+)分/);
        const score = scoreMatch ? scoreMatch[1] : '0';
        
        // 显示结果
        scoreDisplay.textContent = score;
        feedbackContent.innerHTML = result.replace(/\n/g, '<br>');
        resultSection.style.display = 'block';
    } catch (error) {
        alert('分析作业时出错：' + error.message);
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

// 错误处理
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Error: ' + msg + '\nURL: ' + url + '\nLine: ' + lineNo + '\nColumn: ' + columnNo + '\nError object: ' + JSON.stringify(error));
    return false;
}; 