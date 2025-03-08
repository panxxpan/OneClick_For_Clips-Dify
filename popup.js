// 直接在popup.js中实现主要功能，避免模块导入问题
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 加载保存的设置
        const settings = await getSettings();
        console.log('加载的设置:', settings);
        
        // 填充设置到表单
        const siliconFlowApiKeyInput = document.getElementById('siliconFlowApiKey');
        const difyApiInput = document.getElementById('difyApi');
        const difyApiKeyInput = document.getElementById('difyApiKey');
        const difyDatasetIdInput = document.getElementById('difyDatasetId');
        
        if (siliconFlowApiKeyInput && settings.siliconFlowApiKey) {
            siliconFlowApiKeyInput.value = settings.siliconFlowApiKey;
        }
        if (difyApiInput && settings.difyApi) {
            difyApiInput.value = settings.difyApi;
        }
        if (difyApiKeyInput && settings.difyApiKey) {
            difyApiKeyInput.value = settings.difyApiKey;
        }
        if (difyDatasetIdInput && settings.difyDatasetId) {
            difyDatasetIdInput.value = settings.difyDatasetId;
        }

        // 绑定密码显示/隐藏功能
        document.querySelectorAll('.toggle-password').forEach(button => {
            button.addEventListener('click', function() {
                const targetId = this.getAttribute('data-target');
                const input = document.getElementById(targetId);
                if (input) {
                    if (input.type === 'password') {
                        input.type = 'text';
                        this.textContent = '隐藏';
                    } else {
                        input.type = 'password';
                        this.textContent = '显示';
                    }
                }
            });
        });

        // 保存设置按钮事件
        const saveSettingsBtn = document.getElementById('saveSettings');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', async function() {
                try {
                    if (!siliconFlowApiKeyInput || !difyApiInput || !difyApiKeyInput || !difyDatasetIdInput) {
                        showStatus('无法获取设置输入框', 'error');
                        return;
                    }

                    const newSettings = {
                        siliconFlowApiKey: siliconFlowApiKeyInput.value.trim(),
                        difyApi: difyApiInput.value.trim(),
                        difyApiKey: difyApiKeyInput.value.trim(),
                        difyDatasetId: difyDatasetIdInput.value.trim()
                    };

                    // 验证硅基流动API密钥不能为空
                    if (!newSettings.siliconFlowApiKey) {
                        showStatus('请输入硅基流动API密钥', 'error');
                        return;
                    }
                    
                    console.log('准备保存的设置:', newSettings);
                    
                    const success = await saveSettings(newSettings);
                    if (success) {
                        showStatus('设置已保存', 'success');
                        console.log('设置保存成功');
                    } else {
                        showStatus('设置保存失败', 'error');
                        console.error('设置保存失败');
                    }
                } catch (error) {
                    console.error('保存设置时出错:', error);
                    showStatus('保存设置时发生错误', 'error');
                }
            });
        }

        // 初始化数据库
        await initDB();

        // 抓取按钮事件
        const captureBtn = document.getElementById('captureBtn');
        if (captureBtn) {
            captureBtn.addEventListener('click', async function() {
                const button = this;
                button.disabled = true;
                showProgress(true);
                updateProgressText('正在获取页面内容...');
                
                try {
                    // 检查API密钥是否已配置
                    const currentSettings = await getSettings();
                    if (!currentSettings.siliconFlowApiKey) {
                        showStatus('请先配置硅基流动API密钥', 'error');
                        return;
                    }

                    // 获取当前标签页
                    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
                    if (!tab) {
                        throw new Error('无法获取当前标签页');
                    }

                    // 注入并执行内容脚本
                    const [{result}] = await chrome.scripting.executeScript({
                        target: {tabId: tab.id},
                        func: () => {
                            // 尝试获取主要内容
                            const getMainContent = () => {
                                // 尝试获取article标签
                                const article = document.querySelector('article');
                                if (article) return article.innerText;

                                // 尝试获取main标签
                                const main = document.querySelector('main');
                                if (main) return main.innerText;

                                // 尝试获取常见的内容容器
                                const contentSelectors = [
                                    '.article-content',
                                    '.post-content',
                                    '.entry-content',
                                    '.content',
                                    '#content',
                                    '.main-content'
                                ];

                                for (const selector of contentSelectors) {
                                    const element = document.querySelector(selector);
                                    if (element) return element.innerText;
                                }

                                // 如果都没有找到，返回body内容
                                return document.body.innerText;
                            };

                            const content = getMainContent();
                            return {
                                content: content.trim(),
                                url: window.location.href,
                                title: document.title,
                                timestamp: new Date().toISOString()
                            };
                        }
                    });

                    if (!result || !result.content) {
                        throw new Error('无法获取页面内容');
                    }

                    updateProgressText('正在分析内容...');
                    // 发送消息给background处理内容
                    const response = await chrome.runtime.sendMessage({
                        action: 'processContent',
                        content: result.content,
                        url: result.url,
                        timestamp: result.timestamp
                    });

                    if (!response || !response.success) {
                        throw new Error(response?.error || '处理内容失败');
                    }

                    updateProgressText('处理完成！');
                    setTimeout(() => {
                        clearProgress();
                        displayContent(response.result.data);
                    }, 1000);
                    showStatus('内容已成功抓取和处理', 'success');
                } catch (error) {
                    updateProgressText('发生错误');
                    console.error('抓取内容时出错:', error);
                    showStatus('抓取内容时出错: ' + error.message, 'error');
                } finally {
                    button.disabled = false;
                    setTimeout(clearProgress, 2000);
                }
            });
        }

        // 查看数据库按钮点击事件
        document.getElementById('viewDbButton').addEventListener('click', async function() {
            // 打开新标签页显示内容
            chrome.tabs.create({
                url: chrome.runtime.getURL('viewer.html')
            });
        });

        // 添加清空数据库功能
        document.getElementById('clearDB').addEventListener('click', async function() {
            if (confirm('确定要清空所有保存的内容吗？此操作不可恢复！')) {
                try {
                    const result = await chrome.runtime.sendMessage({ action: 'clearDatabase' });
                    if (result.success) {
                        showStatus('数据库已清空', 'success');
                        // 清空显示的内容列表
                        document.getElementById('contentList').innerHTML = '';
                    } else {
                        showStatus('清空数据库失败: ' + result.error, 'error');
                    }
                } catch (error) {
                    showStatus('清空数据库时出错: ' + error.message, 'error');
                }
            }
        });

        // 监听来自background的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'displayContent') {
                displayContent(request.content);
            }
        });
    } catch (error) {
        console.error('初始化时出错:', error);
        showStatus('初始化时发生错误', 'error');
    }
});

// 内容显示函数
function displayContent(content) {
    const contentList = document.getElementById('contentList');
    const contentItem = document.createElement('div');
    contentItem.className = 'content-item';
    
    const title = document.createElement('h4');
    title.textContent = content.title || '未命名文章';
    
    const url = document.createElement('p');
    url.innerHTML = `<strong>URL:</strong> <a href="${content.url}" target="_blank">${content.url}</a>`;
    
    const date = document.createElement('p');
    date.innerHTML = `<strong>日期:</strong> ${content.date}`;
    
    const summary = document.createElement('p');
    summary.innerHTML = `<strong>摘要:</strong> ${content.summary}`;
    
    const keywords = document.createElement('p');
    keywords.innerHTML = `<strong>关键词:</strong> ${content.keywords}`;
    
    contentItem.appendChild(title);
    contentItem.appendChild(url);
    contentItem.appendChild(date);
    contentItem.appendChild(summary);
    contentItem.appendChild(keywords);
    
    contentList.appendChild(contentItem);
}

// 设置相关函数
async function saveSettings(settings) {
    return new Promise((resolve) => {
        // 验证设置对象
        if (!settings || typeof settings !== 'object') {
            console.error('无效的设置对象:', settings);
            resolve(false);
            return;
        }

        // 确保所有设置值都存在
        const settingsToSave = {
            siliconFlowApiKey: settings.siliconFlowApiKey || '',
            difyApi: settings.difyApi || '',
            difyApiKey: settings.difyApiKey || '',
            difyDatasetId: settings.difyDatasetId || ''
        };

        // 检查是否所有值都为空
        const allEmpty = Object.values(settingsToSave).every(value => !value);
        if (allEmpty) {
            console.error('所有设置值都为空');
            resolve(false);
            return;
        }
        
        chrome.storage.sync.set(settingsToSave, () => {
            if (chrome.runtime.lastError) {
                console.error('设置保存失败:', chrome.runtime.lastError);
                resolve(false);
            } else {
                console.log('设置保存成功:', settingsToSave);
                resolve(true);
            }
        });
    });
}

async function getSettings() {
    return new Promise((resolve) => {
        const keys = ['siliconFlowApiKey', 'difyApi', 'difyApiKey', 'difyDatasetId'];
        chrome.storage.sync.get(keys, (result) => {
            if (chrome.runtime.lastError) {
                console.error('设置获取失败:', chrome.runtime.lastError);
                resolve({});
            } else {
                // 确保返回所有键，即使值为空
                const settings = {};
                keys.forEach(key => {
                    settings[key] = result[key] || '';
                });
                console.log('获取到的设置:', settings);
                resolve(settings);
            }
        });
    });
}

// 数据库相关函数
let db = null;

async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ContentDB', 1);
        
        request.onerror = (event) => {
            console.error('数据库打开失败:', event);
            reject(new Error('数据库打开失败'));
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('数据库连接成功');
            resolve();
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('contents')) {
                const store = db.createObjectStore('contents', { keyPath: 'id', autoIncrement: true });
                store.createIndex('date', 'date');
                store.createIndex('url', 'url');
            }
        };
    });
}

async function getAllContentsFromDB() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('数据库未初始化'));
            return;
        }
        
        const transaction = db.transaction(['contents'], 'readonly');
        const store = transaction.objectStore('contents');
        const request = store.getAll();
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = () => {
            console.error('获取数据库内容失败:', request.error);
            reject(request.error);
        };
    });
}

// 进度显示函数
function showProgress(show = true) {
    const progress = document.querySelector('.progress');
    if (progress) {
        progress.style.display = show ? 'block' : 'none';
    }
}

// 更新进度文本
function updateProgressText(text) {
    const progressText = document.getElementById('progressText');
    if (progressText) {
        progressText.textContent = text;
    }
}

// 清除进度显示
function clearProgress() {
    showProgress(false);
    updateProgressText('');
}

// 状态显示函数
function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        
        // 如果是成功或错误消息，3秒后自动隐藏
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                statusDiv.className = 'status';
            }, 3000);
        }
    }
}
