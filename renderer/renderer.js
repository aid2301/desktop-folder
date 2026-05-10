// renderer.js
const foldBtn = document.getElementById('fold-btn');
const closeBtn = document.getElementById('close-btn');
const storageBox = document.getElementById('storage-box');
const themeBtn = document.getElementById('theme-btn');
const themePanel = document.getElementById('theme-panel');
const themeOptions = document.querySelectorAll('.theme-option');

// 获取当前窗口的唯一 ID (用于独立保存配置)
const boxId = window.electronAPI.windowId;

let isFolded = false;

// 1. 初始化独立主题
const savedTheme = localStorage.getItem(`theme-${boxId}`) || 'default';
applyTheme(savedTheme);

// 2. 折叠逻辑
foldBtn.addEventListener('click', () => {
    isFolded = !isFolded;
    if (isFolded) {
        storageBox.classList.add('folded');
        foldBtn.innerText = '▼';
        themePanel.classList.add('hidden');
        setTimeout(() => {
            window.electronAPI.resizeWindow({ height: 60 });
        }, 300);
    } else {
        window.electronAPI.resizeWindow({ height: 600 });
        setTimeout(() => {
            storageBox.classList.remove('folded');
            foldBtn.innerText = '▲';
        }, 10);
    }
});

// 3. 关闭逻辑 (点击按钮只是隐藏本窗口)
closeBtn.addEventListener('click', () => {
    window.close();
});

// 4. 主题切换
themeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    themePanel.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
    if (!themePanel.contains(e.target) && e.target !== themeBtn) {
        themePanel.classList.add('hidden');
    }
});

themeOptions.forEach(option => {
    option.addEventListener('click', () => {
        const theme = option.dataset.theme;
        applyTheme(theme);
        localStorage.setItem(`theme-${boxId}`, theme); // 基于 ID 保存主题
        themePanel.classList.add('hidden');
    });
});

function applyTheme(themeName) {
    storageBox.setAttribute('data-theme-name', themeName);
}

// 5. 调整大小逻辑
let isResizing = false;
let currentResizer = null;
let startX, startY, startWidth, startHeight, startWindowX;

const resizers = document.querySelectorAll('.resizer');
const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;

resizers.forEach(resizer => {
    resizer.addEventListener('mousedown', async (e) => {
        isResizing = true;
        currentResizer = resizer.dataset.direction;
        const bounds = await window.electronAPI.getBounds();
        startX = e.screenX;
        startY = e.screenY;
        startWidth = bounds.width;
        startHeight = bounds.height;
        startWindowX = bounds.x;
        document.body.style.cursor = window.getComputedStyle(resizer).cursor;
        e.preventDefault();
        e.stopPropagation();
    });
});

window.addEventListener('mousemove', (e) => {
    if (!isResizing || isFolded) return;
    const deltaX = e.screenX - startX;
    const deltaY = e.screenY - startY;
    let newWidth = startWidth;
    let newHeight = startHeight;
    let newX = startWindowX;

    if (currentResizer.includes('r')) newWidth = Math.max(MIN_WIDTH, startWidth + deltaX);
    if (currentResizer.includes('b')) newHeight = Math.max(MIN_HEIGHT, startHeight + deltaY);
    if (currentResizer === 'lb') {
        const potentialWidth = startWidth - deltaX;
        if (potentialWidth > MIN_WIDTH) {
            newWidth = potentialWidth;
            newX = startWindowX + deltaX;
        } else {
            newX = startWindowX + (startWidth - MIN_WIDTH);
            newWidth = MIN_WIDTH;
        }
    }
    window.electronAPI.resizeWindow({ x: newX, width: newWidth, height: newHeight });
});

window.addEventListener('mouseup', () => {
    isResizing = false;
    document.body.style.cursor = 'default';
});
