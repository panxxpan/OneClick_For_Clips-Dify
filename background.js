// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'processContent') {
        processPageContent(request.content, request.url, request.timestamp)
            .then(result => sendResponse({ success: true, result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // 保持消息通道开放以进行异步响应
    } else if (request.action === 'clearDatabase') {
        clearDatabase()
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

async function processPageContent(content, url, timestamp) {
    let db = null;
    try {
        // 获取设置
        const settings = await chrome.storage.sync.get([
            'siliconFlowApiKey',
            'difyApi',
            'difyApiKey',
            'difyDatasetId'
        ]);
        
        if (!settings.siliconFlowApiKey) {
            throw new Error('未配置硅基流动API密钥');
        }

        // 调用硅基流动API进行内容分析
        const summary = await callSiliconFlowAPI(content, settings.siliconFlowApiKey, url);
        
        // 准备数据
        const data = {
            date: new Date(timestamp).toLocaleDateString(),
            summary: summary.summary,
            keywords: Array.isArray(summary.keywords) ? summary.keywords.join(', ') : '',
            url: url,
            notes: '',
            title: summary.title || '', // 添加标题字段
            timestamp: timestamp
        };

        // 连接到IndexedDB
        db = await connectDB();
        
        // 保存到IndexedDB
        await saveToIndexedDB(db, data);
        
        // 如果配置了Dify，则同步到Dify知识库
        if (settings.difyApi && settings.difyApiKey && settings.difyDatasetId) {
            try {
                await syncToDify(content, settings.difyApi, settings.difyApiKey, settings.difyDatasetId, data.title, url);
                console.log('成功同步到Dify知识库');
            } catch (difyError) {
                console.error('同步到Dify失败:', difyError);
            }
        }

        return { 
            message: '处理成功', 
            data,
            difyStatus: settings.difyApi ? '已同步到Dify' : '未配置Dify'
        };
        
    } catch (error) {
        console.error('处理内容时出错:', error);
        throw error;
    } finally {
        if (db) {
            db.close();
        }
    }
}

async function callSiliconFlowAPI(content, apiKey, url) {
    try {
        const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "deepseek-ai/DeepSeek-V2.5",
                messages: [
                    {
                        "role": "system",
                        "content": "你是一个网页内容分析助手。请分析提供的网页内容，提取标题、生成总结和关键词。直接返回JSON格式数据，不要添加任何其他格式标记。格式：{\"title\": \"文章标题\", \"summary\": \"总结内容\", \"keywords\": [\"关键词1\", \"关键词2\"]}"
                    },
                    {
                        "role": "user",
                        "content": `URL: ${url}\n\n内容:\n${content}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 1024,
                stream: false
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API调用失败: ${errorData.message || response.statusText}`);
        }
        
        const result = await response.json();
        
        try {
            const modelResponse = result.choices[0].message.content;
            
            // 清理可能的 Markdown 标记
            const cleanedResponse = modelResponse.replace(/```json\s*|\s*```/g, '').trim();
            console.log('清理后的响应:', cleanedResponse); // 调试日志
            
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(cleanedResponse);
            } catch (parseError) {
                console.error('第一次解析失败，尝试提取 JSON 部分:', parseError);
                // 尝试提取 { } 之间的内容
                const match = cleanedResponse.match(/\{[\s\S]*\}/);
                if (match) {
                    parsedResponse = JSON.parse(match[0]);
                } else {
                    throw new Error('无法从响应中提取有效的 JSON');
                }
            }
            
            // 验证返回的数据格式
            if (!parsedResponse.title || !parsedResponse.summary || !Array.isArray(parsedResponse.keywords)) {
                throw new Error('响应数据格式不正确');
            }
            
            return {
                title: parsedResponse.title,
                summary: parsedResponse.summary,
                keywords: parsedResponse.keywords
            };
        } catch (parseError) {
            console.error('解析模型响应时出错:', parseError, '\n原始响应:', modelResponse);
            throw new Error('无法解析模型响应');
        }
    } catch (error) {
        console.error('调用硅基流动API时出错:', error);
        throw error;
    }
}

async function syncToDify(content, apiUrl, apiKey, datasetId, title, url) {
    try {
        const endpoint = `${apiUrl.endsWith('/') ? apiUrl : apiUrl + '/'}datasets/${datasetId}/document/create-by-text`;
        
        // 使用文章标题和时间戳作为文档名
        const documentTitle = `${title || '未命名文章'}_${new Date().getTime()}`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                name: documentTitle,
                text: `标题: ${title}\nURL: ${url}\n\n${content}`,
                indexing_technique: "high_quality",
                process_rule: {
                    mode: "automatic"
                },
                doc_form: "text_model"
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`同步到Dify失败: ${errorData.message || response.statusText}`);
        }

        const result = await response.json();
        console.log('Dify同步成功:', result);
        return result;
    } catch (error) {
        console.error('同步到Dify时出错:', error);
        throw error;
    }
}

// 添加清理数据库的功能
async function clearDatabase() {
    let db = null;
    try {
        db = await connectDB();
        const transaction = db.transaction(['contents'], 'readwrite');
        const store = transaction.objectStore('contents');
        
        await new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => {
                console.log('数据库已清空');
                resolve();
            };
            request.onerror = () => {
                console.error('清空数据库失败:', request.error);
                reject(request.error);
            };
        });
        
        return { success: true, message: '数据库已成功清空' };
    } catch (error) {
        console.error('清空数据库时出错:', error);
        throw error;
    } finally {
        if (db) {
            db.close();
        }
    }
}

async function downloadExcel(data) {
    try {
        // 创建CSV内容
        const headers = ['日期', '要点', '关键词', '原始网址', '备注'];
        const row = [
            data.date,
            data.summary,
            data.keywords,
            data.url,
            data.notes || ''
        ];
        
        const csvContent = [
            headers.join(','),
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ].join('\n');

        // 生成文件名
        const fileName = generateFileName();

        // 添加BOM以确保Excel正确识别中文
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8' });

        // 下载文件
        await chrome.downloads.download({
            url: URL.createObjectURL(blob),
            filename: fileName,
            saveAs: true
        });

        return { message: '文件下载成功' };
    } catch (error) {
        console.error('下载Excel文件时出错:', error);
        throw error;
    }
}

function generateFileName() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `知识收藏_${year}${month}${day}_${hour}${minute}.csv`;
}

// IndexedDB相关函数
async function connectDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ContentDB', 1);
        
        request.onerror = (event) => {
            console.error('数据库打开失败:', event);
            reject(new Error('数据库打开失败'));
        };
        
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('contents')) {
                const store = db.createObjectStore('contents', { keyPath: 'id', autoIncrement: true });
                store.createIndex('date', 'date');
                store.createIndex('url', 'url');
                store.createIndex('timestamp', 'timestamp');
            }
        };
    });
}

async function saveToIndexedDB(db, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['contents'], 'readwrite');
        const store = transaction.objectStore('contents');
        
        const request = store.add(data);
        
        request.onsuccess = () => {
            console.log('内容已添加到数据库');
            resolve(request.result);
        };
        
        request.onerror = () => {
            console.error('添加内容到数据库失败:', request.error);
            reject(request.error);
        };
    });
}
