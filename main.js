const { app, BrowserWindow, Tray, Menu, screen, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let tray;
const windows = new Set();

// 配置自动更新
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// 创建新收纳框窗口
function createBoxWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  const windowWidth = 400;
  const windowHeight = 600;

  const randomX = Math.floor(Math.random() * (screenWidth - windowWidth));
  const randomY = Math.floor(Math.random() * (screenHeight - windowHeight));

  const win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: randomX,
    y: randomY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      additionalArguments: [`--window-id=box-${Date.now()}-${Math.floor(Math.random()*1000)}`]
    }
  });

  win.loadFile('renderer/index.html');
  windows.add(win);

  win.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  win.on('closed', () => {
    windows.delete(win);
  });

  return win;
}

// IPC 消息处理
ipcMain.on('resize-window', (event, bounds) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    const currentBounds = win.getBounds();
    win.setBounds({
        x: bounds.x !== undefined ? Math.round(bounds.x) : currentBounds.x,
        y: bounds.y !== undefined ? Math.round(bounds.y) : currentBounds.y,
        width: bounds.width !== undefined ? Math.round(bounds.width) : currentBounds.width,
        height: bounds.height !== undefined ? Math.round(bounds.height) : currentBounds.height
    });
  }
});

ipcMain.handle('get-bounds', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win ? win.getBounds() : null;
});

// 托盘管理
function updateTray() {
  const contextMenu = Menu.buildFromTemplate([
    { label: '新建收纳框', click: () => createBoxWindow() },
    { type: 'separator' },
    { label: '全部显示', click: () => windows.forEach(win => win.show()) },
    { label: '全部隐藏', click: () => windows.forEach(win => win.hide()) },
    { type: 'separator' },
    { 
      label: '检查更新', 
      click: () => {
        autoUpdater.checkForUpdatesAndNotify();
      }
    },
    { 
      label: '开机启动', 
      type: 'checkbox', 
      checked: app.getLoginItemSettings().openAtLogin,
      click: () => {
        const status = app.getLoginItemSettings().openAtLogin;
        app.setLoginItemSettings({ openAtLogin: !status, path: app.getPath('exe') });
        updateTray();
      }
    },
    { type: 'separator' },
    { label: '退出程序', click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);
}

function createTray() {
  // 确保 icon.png 存在
  const iconPath = path.join(__dirname, 'icon.png');
  tray = new Tray(iconPath);
  tray.setToolTip('DesktopHelper');
  updateTray();
  
  tray.on('click', () => {
    if (windows.size > 0) {
        const anyVisible = Array.from(windows).some(win => win.isVisible());
        windows.forEach(win => anyVisible ? win.hide() : win.show());
    }
  });
}

// 自动更新事件处理
autoUpdater.on('update-available', () => {
  tray.displayBalloon({
    title: '发现新版本',
    content: '正在下载新版本，请稍候...',
    icon: path.join(__dirname, 'icon.png')
  });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: '更新已就绪',
    message: '新版本已下载完成，是否立即重启安装？',
    buttons: ['重启更新', '稍后']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (err) => {
  console.error('更新错误:', err);
});

app.whenReady().then(() => {
  createTray();
  createBoxWindow();

  // 非开发环境下检查更新
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  app.on('activate', () => {
    if (windows.size === 0) createBoxWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {}
});
