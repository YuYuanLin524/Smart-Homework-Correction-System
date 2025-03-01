/**
 * 智能作业批改系统 - 结果展示
 * 负责处理批改结果的展示和下载
 */

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 初始化结果功能
    initResults();
});

/**
 * 初始化结果功能
 */
function initResults() {
    const downloadBtn = document.getElementById('download-btn');
    
    // 下载按钮点击事件
    downloadBtn.addEventListener('click', function() {
        generateReport();
    });
}

/**
 * 生成并下载批改报告
 */
function generateReport() {
    // 获取结果数据
    const score = document.getElementById('score').textContent;
    const comment = document.getElementById('overall-comment').textContent;
    
    // 获取具体问题
    const issuesList = document.getElementById('specific-issues');
    const issues = [];
    
    for (let i = 0; i < issuesList.children.length; i++) {
        issues.push(issuesList.children[i].textContent);
    }
    
    // 获取改进建议
    const suggestions = document.getElementById('improvement-suggestions').textContent;
    
    // 确定数据类型
    const isImage = document.getElementById('results-image-container').style.display !== 'none';
    
    // 获取内容
    let contentHtml;
    if (isImage) {
        // 获取图片
        const imageUrl = document.getElementById('result-image').src;
        contentHtml = `
        <div class="image-section">
            <img src="${imageUrl}" alt="批改作业">
        </div>`;
    } else {
        // 获取文本
        const textContent = document.getElementById('result-text').textContent;
        contentHtml = `
        <div class="text-section">
            <h2>作业内容</h2>
            <div class="text-content">${textContent.replace(/\n/g, '<br>')}</div>
        </div>`;
    }
    
    // 创建报告内容
    const reportContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>作业批改报告</title>
    <style>
        body {
            font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            background-color: #f9f9f9;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }
        .header h1 {
            color: #007AFF;
            margin-bottom: 10px;
        }
        .header p {
            color: #666;
            margin: 0;
        }
        .score-section {
            text-align: center;
            margin-bottom: 30px;
        }
        .score {
            font-size: 72px;
            font-weight: bold;
            color: #007AFF;
        }
        .score-label {
            font-size: 18px;
            color: #666;
        }
        .image-section {
            margin-bottom: 30px;
            text-align: center;
        }
        .image-section img {
            max-width: 100%;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .text-section {
            margin-bottom: 30px;
        }
        .text-section h2 {
            color: #007AFF;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        .text-content {
            background-color: #f8f8f8;
            padding: 15px;
            border-radius: 5px;
            line-height: 1.6;
            white-space: pre-wrap;
        }
        .details-section {
            margin-bottom: 30px;
        }
        .details-section h2 {
            color: #007AFF;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        .details-section p {
            line-height: 1.6;
            color: #333;
        }
        .issues-list {
            padding-left: 20px;
        }
        .issues-list li {
            margin-bottom: 10px;
            line-height: 1.6;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>作业批改报告</h1>
            <p>生成时间：${new Date().toLocaleString()}</p>
        </div>
        
        <div class="score-section">
            <div class="score">${score}</div>
            <div class="score-label">分</div>
        </div>
        
        ${contentHtml}
        
        <div class="details-section">
            <h2>总体评价</h2>
            <p>${comment}</p>
        </div>
        
        <div class="details-section">
            <h2>具体问题</h2>
            <ul class="issues-list">
                ${issues.map(issue => `<li>${issue}</li>`).join('')}
            </ul>
        </div>
        
        <div class="details-section">
            <h2>改进建议</h2>
            <p>${suggestions}</p>
        </div>
        
        <div class="footer">
            <p>智能作业批改系统 | 为学习而设计</p>
        </div>
    </div>
</body>
</html>
    `;
    
    // 创建Blob对象
    const blob = new Blob([reportContent], { type: 'text/html' });
    
    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `作业批改报告_${new Date().toISOString().slice(0, 10)}.html`;
    
    // 触发下载
    document.body.appendChild(a);
    a.click();
    
    // 清理
    setTimeout(function() {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

/**
 * 创建并显示批改结果
 * @param {Object} result - 批改结果数据
 */
function displayResult(result) {
    // 设置分数
    document.getElementById('score').textContent = result.score;
    
    // 设置图片
    document.getElementById('result-image').src = result.imageUrl;
    
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
} 