/**
 * 网页内容抓取服务
 */
export class WebScraper {
    /**
     * 抓取页面内容
     * @param {Document} document - 页面DOM文档
     * @returns {string} 提取的文本内容
     */
    static extractContent(document) {
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
                const bodyText = document.body.innerText;
                content = bodyText;
            }
        }
        
        return this.cleanContent(content);
    }

    /**
     * 清理和格式化内容
     * @param {string} content - 原始内容
     * @returns {string} 清理后的内容
     */
    static cleanContent(content) {
        if (!content) {
            throw new Error('无法抓取页面内容');
        }

        return content
            .replace(/[\r\n]+/g, '\n') // 统一换行符
            .replace(/\s+/g, ' ') // 合并空格
            .trim(); // 移除首尾空格
    }
}
