/**
 * Dify API调用服务
 */
export class DifyService {
    constructor(apiUrl, datasetId) {
        // 确保apiUrl不以斜杠结尾
        this.apiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        this.datasetId = datasetId;
    }

    /**
     * 同步内容到Dify知识库
     * @param {string} content - 要同步的内容
     * @param {string} url - 内容来源URL
     * @returns {Promise<void>}
     */
    async syncContent(content, url) {
        try {
            // 构建API请求URL
            const apiEndpoint = `${this.apiUrl}/datasets/${this.datasetId}/documents`;
            
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.apiKey // 需要添加认证
                },
                body: JSON.stringify({
                    segments: [{
                        content: content,
                        reference: url,
                        source: url,
                        source_type: 'web'
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`同步到Dify失败: ${errorData.message || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('同步到Dify时出错:', error);
            throw error;
        }
    }

    /**
     * 更新配置
     * @param {string} apiUrl - 新的API URL
     * @param {string} datasetId - 新的数据集ID
     * @param {string} apiKey - API密钥
     */
    updateConfig(apiUrl, datasetId, apiKey) {
        this.apiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        this.datasetId = datasetId;
        this.apiKey = apiKey;
    }
}
