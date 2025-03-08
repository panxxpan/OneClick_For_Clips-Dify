// 连接到数据库
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

// 显示内容
function displayContent(content) {
    const contentList = document.getElementById('contentList');
    const contentItem = document.createElement('div');
    contentItem.className = 'content-item';
    
    const title = document.createElement('h3');
    title.textContent = content.title || '未命名文章';
    
    const meta = document.createElement('div');
    meta.className = 'content-meta';
    meta.innerHTML = `
        <div><strong>URL:</strong> <a href="${content.url}" target="_blank">${content.url}</a></div>
        <div><strong>日期:</strong> ${content.date}</div>
    `;
    
    const summary = document.createElement('div');
    summary.className = 'content-summary';
    summary.innerHTML = `<strong>摘要:</strong> ${content.summary}`;
    
    const keywords = document.createElement('div');
    keywords.className = 'content-keywords';
    keywords.innerHTML = '<strong>关键词:</strong> ' + 
        content.keywords.split(',').map(kw => 
            `<span class="keyword-tag">${kw.trim()}</span>`
        ).join(' ');
    
    contentItem.appendChild(title);
    contentItem.appendChild(meta);
    contentItem.appendChild(summary);
    contentItem.appendChild(keywords);
    
    contentList.appendChild(contentItem);
}

// 加载所有内容
async function loadContents() {
    try {
        const db = await connectDB();
        const transaction = db.transaction(['contents'], 'readonly');
        const store = transaction.objectStore('contents');
        const request = store.getAll();
        
        request.onsuccess = () => {
            const contentList = document.getElementById('contentList');
            contentList.innerHTML = '';
            
            const contents = request.result;
            if (contents.length === 0) {
                contentList.innerHTML = '<div class="alert alert-info">暂无保存的内容</div>';
            } else {
                // 按时间戳排序，最新的在前面
                contents.sort((a, b) => b.timestamp - a.timestamp);
                contents.forEach(content => displayContent(content));
            }
        };
        
        request.onerror = () => {
            console.error('加载数据失败');
            document.getElementById('contentList').innerHTML = 
                '<div class="alert alert-danger">加载数据失败</div>';
        };
    } catch (error) {
        console.error('加载内容时出错:', error);
        document.getElementById('contentList').innerHTML = 
            '<div class="alert alert-danger">加载内容时出错: ' + error.message + '</div>';
    }
}

// 搜索功能
function filterContents(searchText) {
    const items = document.getElementsByClassName('content-item');
    for (let item of items) {
        const text = item.textContent.toLowerCase();
        if (text.includes(searchText.toLowerCase())) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    }
}

// 导出CSV
async function exportToCSV() {
    try {
        const db = await connectDB();
        const transaction = db.transaction(['contents'], 'readonly');
        const store = transaction.objectStore('contents');
        const request = store.getAll();
        
        request.onsuccess = () => {
            const contents = request.result;
            if (contents.length === 0) {
                alert('没有可导出的内容');
                return;
            }
            
            const csvContent = [
                ['标题', 'URL', '日期', '摘要', '关键词']
            ];
            
            contents.forEach(content => {
                csvContent.push([
                    content.title || '未命名文章',
                    content.url,
                    content.date,
                    content.summary,
                    content.keywords
                ]);
            });
            
            const csvString = csvContent.map(row => 
                row.map(cell => `"${String(cell).replace(/"/g, '""')}"`)
                   .join(',')
            ).join('\n');
            
            const blob = new Blob(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = getFileName();
            link.click();
        };
    } catch (error) {
        console.error('导出CSV时出错:', error);
        alert('导出CSV时出错: ' + error.message);
    }
}

// 生成文件名
function getFileName() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `知识收藏_${year}${month}${day}_${hour}${minute}.csv`;
}

// 清空数据库
async function clearDatabase() {
    if (!confirm('确定要清空所有保存的内容吗？此操作不可恢复！')) {
        return;
    }
    
    try {
        const db = await connectDB();
        const transaction = db.transaction(['contents'], 'readwrite');
        const store = transaction.objectStore('contents');
        
        const request = store.clear();
        request.onsuccess = () => {
            alert('数据库已清空');
            loadContents(); // 重新加载（显示空状态）
        };
        
        request.onerror = () => {
            console.error('清空数据库失败:', request.error);
            alert('清空数据库失败');
        };
    } catch (error) {
        console.error('清空数据库时出错:', error);
        alert('清空数据库时出错: ' + error.message);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 加载内容
    loadContents();
    
    // 搜索功能
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterContents(this.value);
        });
    }
    
    // 导出CSV按钮
    const exportCSVBtn = document.getElementById('exportCSV');
    if (exportCSVBtn) {
        exportCSVBtn.addEventListener('click', exportToCSV);
    }
    
    // 清空数据库按钮
    const clearDBBtn = document.getElementById('clearDB');
    if (clearDBBtn) {
        clearDBBtn.addEventListener('click', clearDatabase);
    }
});
