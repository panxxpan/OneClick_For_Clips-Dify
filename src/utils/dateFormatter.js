/**
 * 日期处理工具
 */
export class DateFormatter {
    /**
     * 格式化日期为本地字符串
     * @param {Date|string} date - 日期对象或日期字符串
     * @returns {string} 格式化后的日期字符串
     */
    static formatToLocal(date) {
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    /**
     * 格式化日期时间为文件名安全的字符串
     * @param {Date|string} date - 日期对象或日期字符串
     * @returns {string} 格式化后的字符串
     */
    static formatForFileName(date) {
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toISOString().slice(0, 19).replace(/[:-]/g, '');
    }

    /**
     * 获取当前时间戳
     * @returns {string} ISO格式的时间戳
     */
    static getCurrentTimestamp() {
        return new Date().toISOString();
    }
}
