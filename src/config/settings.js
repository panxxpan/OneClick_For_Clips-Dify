/**
 * 用户配置管理
 */
export class Settings {
    static STORAGE_KEYS = {
        DIFY_API: 'difyApi',
        DIFY_DATASET_ID: 'difyDatasetId',
        DIFY_API_KEY: 'difyApiKey',
        SILICON_FLOW_API_KEY: 'siliconFlowApiKey'
    };

    /**
     * 获取所有设置
     * @returns {Promise<Object>} 设置对象
     */
    static async getAll() {
        return new Promise((resolve) => {
            chrome.storage.sync.get([
                this.STORAGE_KEYS.DIFY_API,
                this.STORAGE_KEYS.DIFY_DATASET_ID,
                this.STORAGE_KEYS.DIFY_API_KEY,
                this.STORAGE_KEYS.SILICON_FLOW_API_KEY
            ], (result) => {
                resolve({
                    difyApi: result[this.STORAGE_KEYS.DIFY_API] || '',
                    difyDatasetId: result[this.STORAGE_KEYS.DIFY_DATASET_ID] || '',
                    difyApiKey: result[this.STORAGE_KEYS.DIFY_API_KEY] || '',
                    siliconFlowApiKey: result[this.STORAGE_KEYS.SILICON_FLOW_API_KEY] || ''
                });
            });
        });
    }

    /**
     * 保存设置
     * @param {Object} settings - 要保存的设置
     * @returns {Promise<void>}
     */
    static async save(settings) {
        return new Promise((resolve) => {
            chrome.storage.sync.set({
                [this.STORAGE_KEYS.DIFY_API]: settings.difyApi || '',
                [this.STORAGE_KEYS.DIFY_DATASET_ID]: settings.difyDatasetId || '',
                [this.STORAGE_KEYS.DIFY_API_KEY]: settings.difyApiKey || '',
                [this.STORAGE_KEYS.SILICON_FLOW_API_KEY]: settings.siliconFlowApiKey || ''
            }, resolve);
        });
    }

    /**
     * 检查是否配置了必要的设置
     * @returns {Promise<boolean>}
     */
    static async isConfigured() {
        const settings = await this.getAll();
        return !!settings.siliconFlowApiKey;
    }

    /**
     * 检查是否配置了Dify
     * @returns {Promise<boolean>}
     */
    static async isDifyConfigured() {
        const settings = await this.getAll();
        return !!(settings.difyApi && settings.difyDatasetId && settings.difyApiKey);
    }
}
