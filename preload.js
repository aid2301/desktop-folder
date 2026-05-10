const { contextBridge, ipcRenderer } = require('electron');

// 从命令行参数中解析出 window-id
const windowIdArg = process.argv.find(arg => arg.startsWith('--window-id='));
const windowId = windowIdArg ? windowIdArg.split('=')[1] : 'default-box';

contextBridge.exposeInMainWorld('electronAPI', {
  windowId: windowId, // 将窗口 ID 暴露给渲染进程
  resizeWindow: (bounds) => ipcRenderer.send('resize-window', bounds),
  getBounds: () => ipcRenderer.invoke('get-bounds')
});
