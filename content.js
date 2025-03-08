// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'capture') {
        try {
            const content = extractPageContent();
            sendResponse({ success: true, content: content });
            
            // 发送内容到background script进行处理
            chrome.runtime.sendMessage({
                action: 'processContent',
                content: content,
                url: window.location.href,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }
    return true; // 保持消息通道开放
});

function extractPageContent() {
    // 获取主要内容
    let content = '';
    
    // 尝试获取文章主体内容
    const article = document.querySelector('article');
    if (article) {
        content = article.innerText;
    } else {
        // 如果没有article标签，获取主要内容区域
        const mainContent = document.querySelector('main') || 
                          document.querySelector('.main-content') || 
                          document.querySelector('#content') ||
                          document.querySelector('.content');
        
        if (mainContent) {
            content = mainContent.innerText;
        } else {
            // 如果没有明显的主要内容区域，获取body中的所有文本
            // 排除script、style等标签
            const bodyText = document.body.innerText;
            content = bodyText;
        }
    }
    
    // 清理内容
    content = content
        .replace(/[\r\n]+/g, '\n') // 统一换行符
        .replace(/\s+/g, ' ') // 合并空格
        .trim(); // 移除首尾空格
    
    if (!content) {
        throw new Error('无法抓取页面内容');
    }
    
    return content;
}
