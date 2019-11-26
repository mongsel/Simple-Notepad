const {app, BrowserWindow, ipcMain, Menu} = require('electron');
const path = require('path');

// 主菜单模板
const menuTemplate = [
  {
    label: ' 文件 ',
    submenu: [
      { 
        label: '新建', 
        accelerator: 'CmdOrCtrl+N', 
        click: function() {
          mainWindow.webContents.send('action', 'new') 
        } 
      },
      { 
        label: '打开', 
        accelerator: 'CmdOrCtrl+O', 
        click: function() {
          mainWindow.webContents.send('action', 'open') 
        } 
      },
      { 
        label: '保存', 
        accelerator: 'CmdOrCtrl+S', 
        click: function() {
          mainWindow.webContents.send('action', 'save') 
        } 
      },
      { 
        label: '另存为...  ', 
        accelerator: 'CmdOrCtrl+Shift+S', 
        click: function() {
          mainWindow.webContents.send('action', 'save-as') 
        } 
      },
      { 
        type: 'separator' 
      },
      {
        label: '退出',
        click: function() {
          mainWindow.webContents.send('action', 'exit') 
        }
      }
    ]
  },
  {
    label: ' 编辑 ',
    submenu: [
      { label: '返回', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
      { label: '重做', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
      { type: 'separator' },  //分隔线
      { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
      { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
      { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
      { label: '删除', accelerator: 'CmdOrCtrl+D', role: 'delete' },
      { type: 'separator' },  //分隔线
      { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectall' } 
    ]
  },
  {
    label: ' 帮助 ',
    submenu: [
      {
        label: '关于...  ',
        click: async () => {
          const { shell } = require('electron');
          await shell.openExternal('https://segmentfault.com/u/shaomeng');
        }
      }
    ]
  }
];

// 主窗体
let mainWindow;
// 安全退出初始化
let safeExit = false;

// 构建主菜单
let menu = Menu.buildFromTemplate (menuTemplate);
Menu.setApplicationMenu (menu);

// 主窗体初始化
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 620,
    resizable:false,
    backgroundColor: '#e9e9e9',
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 加载页面内容
  mainWindow.loadFile('index.html');

  // 开发者工具
  // mainWindow.webContents.openDevTools();

  // 窗体生命周期 close 操作
  mainWindow.on('close', (e) => {
    if(!safeExit) {
      e.preventDefault();
    }
    mainWindow.webContents.send('action', 'exit');
  });
  // 窗体生命周期 closed 操作
  mainWindow.on('closed', function() {
    mainWindow = null;
  });
}

// 程序生命周期 ready
app.on('ready', createWindow);
// 程序生命周期 window-all-closed
app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') app.quit();
});
// 程序生命周期 activate
app.on('activate', function() {
  if (mainWindow === null) createWindow();
});


// 接收退出命令
ipcMain.on('exit', function() {
  safeExit = true;
  app.quit();
});