/**
 * 硅基流动API调用服务
 */
export class AiService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.siliconflow.com/v1';
    }

    /**
     * 调用API进行文本分析
     * @param {string} content - 需要分析的文本内容
     * @returns {Promise<{summary: string, keywords: string[]}>} 分析结果
     */
    async analyzeText(content) {
        try {
            const response = await fetch(`${this.baseUrl}/text/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-v3',
                    text: content,
                    options: {
                        generate_summary: true,
                        extract_keywords: true
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API调用失败: ${errorData.message || response.statusText}`);
            }

            const result = await response.json();
            return {
                summary: result.summary || '',
                keywords: result.keywords || []
            };
        } catch (error) {
            console.error('调用硅基流动API时出错:', error);
            throw error;
        }
    }

    /**
     * 设置API密钥
     * @param {string} apiKey - 新的API密钥
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }
}
