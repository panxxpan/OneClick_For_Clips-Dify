/**
 * 文本处理工具
 */
export class TextProcessor {
    /**
     * 清理文本内容
     * @param {string} text - 原始文本
     * @returns {string} 清理后的文本
     */
    static clean(text) {
        if (!text) return '';
        
        return text
            .replace(/[\r\n]+/g, '\n') // 统一换行符
            .replace(/\s+/g, ' ') // 合并空格
            .trim(); // 移除首尾空格
    }

    /**
     * 提取关键词
     * @param {string[]} keywords - 关键词数组
     * @returns {string} 格式化后的关键词字符串
     */
    static formatKeywords(keywords) {
        if (!Array.isArray(keywords)) return '';
        return keywords.join('、');
    }

    /**
     * 截断文本
     * @param {string} text - 原始文本
     * @param {number} maxLength - 最大长度
     * @returns {string} 截断后的文本
     */
    static truncate(text, maxLength = 500) {
        if (!text || text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    }

    /**
     * 移除HTML标签
     * @param {string} html - 包含HTML标签的文本
     * @returns {string} 清理后的纯文本
     */
    static removeHtmlTags(html) {
        if (!html) return '';
        return html.replace(/<[^>]*>/g, '');
    }
}
