const { app, BrowserWindow } = require('electron');
let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1366,
    height: 700,
    webPreferences: {
      nodeIntegration: false
    }
  });
  win.loadURL(`http://192.168.118.16:8020/signature/web/viewer.html`);
  
  // 开启调试工具
  win.webContents.openDevTools();
  win.on('close', () => {
    // 回收 BrowserWindow 对象
    win = null;
  });
  win.on('resize', () => {
    win.reload();
  });
}

app.on('ready', createWindow);
app.on('window-all-closed', () => {
  app.quit();
});
app.on('activate', () => {
  if (window == null) {
    createWindow();
  }
});