/**
 * Excel文件处理服务
 */
export class ExcelService {
    /**
     * 生成Excel文件
     * @param {Object} data - 要保存的数据
     * @param {string} data.date - 日期
     * @param {string} data.summary - 内容摘要
     * @param {string} data.keywords - 关键词
     * @param {string} data.url - 原始网址
     * @param {string} data.notes - 备注
     * @returns {Blob} Excel文件的Blob对象
     */
    static generateExcel(data) {
        // 创建CSV内容
        const headers = ['日期', '要点', '关键词', '原始网址', '备注'];
        const row = [data.date, data.summary, data.keywords, data.url, data.notes || ''];
        
        // 将数组转换为CSV格式
        const csvContent = [
            headers.join(','),
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ].join('\n');

        // 添加BOM以确保Excel正确识别中文
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { 
            type: 'text/csv;charset=utf-8' 
        });

        return blob;
    }

    /**
     * 生成文件名，格式为 ddmm 知识收藏.csv
     * @returns {string}
     */
    static generateFileName() {
        const date = new Date();
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${day}${month}知识收藏.csv`;
    }

    /**
     * 下载Excel文件，若文件已存在则追加内容
     * @param {Object} data
     * @returns {Promise<void>}
     */
    static async downloadExcel(data) {
        try {
            const fileName = this.generateFileName();
            const desktopPath = `${await this.getDesktopPath()}\\${fileName}`;
            
            // 准备新行数据
            const row = [
                data.date,
                data.summary,
                data.keywords,
                data.url,
                data.notes || ''
            ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');

            // 尝试读取现有文件
            let existingContent = '';
            try {
                const response = await fetch(`file:///${desktopPath}`);
                existingContent = await response.text();
            } catch (error) {
                // 文件不存在或无法读取，使用表头
                existingContent = '日期,要点,关键词,原始网址,备注\n';
            }

            // 合并内容
            const csvContent = existingContent + row + '\n';

            // 添加 BOM 以确保 Excel 正确识别中文
            const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
            const blob = new Blob([bom, csvContent], { 
                type: 'text/csv;charset=utf-8' 
            });

            // 使用 Chrome 下载 API
            await chrome.downloads.download({
                url: URL.createObjectURL(blob),
                filename: desktopPath,
                saveAs: false,
                conflictAction: 'overwrite'
            });

        } catch (error) {
            console.error('Excel 处理错误:', error);
            throw new Error('保存到 Excel 失败');
        }
    }

    /**
     * 获取桌面路径
     * @returns {Promise<string>}
     */
    static async getDesktopPath() {
        // 这里假设桌面路径为用户目录下的"Desktop"
        // 在实际应用中可能需要更复杂的逻辑来获取桌面路径
        const userDirectory = await this.getUserDirectory();
        return `${userDirectory}\\Desktop`;
    }

    /**
     * 获取用户目录
     * @returns {Promise<string>}
     */
    static async getUserDirectory() {
        // 使用 Chrome API 或其他方法获取用户目录
        // 这里是一个简单的假设实现
        return 'C:\\Users\\YourUsername';
    }
}
