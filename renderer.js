const ipcRenderer = require('electron').ipcRenderer; // electron 通信模块
const remote = require('electron').remote; // electron 主进程与渲染进程通信模块
const Menu = remote.Menu; // electron renderer进程的菜单模块
const dialog = remote.dialog; // electron 对话框模块


// 初始化基本参数
let isSave = true; // 初始状态无需保存
let txtEditor = document.getElementById('txtEditor'); // 获取文本框对象
let currentFile = null; // 初始状态无文件路径
let isQuit = true; // 初始状态可正常退出


// 右键菜单模板
const contextMenuTemplate = [
    { label: '返回', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
    { label: '重做', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
    { type: 'separator' },  //分隔线
    { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
    { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
    { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
    { label: '删除', accelerator: 'CmdOrCtrl+D', role: 'delete' },
    { type: 'separator' },  //分隔线
    { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectall' } 
];
// 构建右键菜单
const contextMenu = Menu.buildFromTemplate(contextMenuTemplate);
txtEditor.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    contextMenu.popup(remote.getCurrentWindow());
});


// 检测编辑器是否有内容更新，统计字数
txtEditor.oninput = (e) => {
    if (isSave) {
        document.title += ' *';
    }
    isSave = false;
    // 字数统计
    wordsCount();
}


// 菜单操作
ipcRenderer.on('action', (event, arg) => {
    switch(arg) {
        case 'new': // 新建文档
            askSaveNeed();
            initDoc();
            break;
        case 'open': // 打开文档
            askSaveNeed();
            openFile();
            wordsCount();
            break;
        case 'save': // 保存当前文档
            saveCurrentDoc();
            break;
        case 'save-as': // 另存为当前文档
            currentFile = null;
            saveCurrentDoc();
            break;
        case 'exit': // 退出
            askSaveNeed();
            if(isQuit) { // 正常退出
                ipcRenderer.sendSync('exit');
            }
            isQuit = true; // 复位正常退出
            break;
    }
});


// 初始化文档
function initDoc() {
    currentFile = null;
    txtEditor.value = '';
    document.title = 'Notepad - Untitled';
    isSave = true;
	document.getElementById("txtNum").innerHTML = 0;
}


// 询问是否保存命令
function askSaveNeed() {
    // 检测是否需要执行保存命令
    if (isSave) {
        return;
    }
    // 弹窗类型为 message
    const options = {
        type: 'question',
        message: '请问是否保存当前文档？',
        buttons: [ 'Yes', 'No', 'Cancel']
    }
    // 处理弹窗操作结果
    const selection = dialog.showMessageBoxSync(remote.getCurrentWindow(), options);
    // 按钮 yes no cansel 分别为 [0, 1, 2]
    if (selection == 0) {
        saveCurrentDoc();
    } else if(selection == 1) {
        console.log('Cancel and Quit!');
    } else { // 点击 cancel 或者关闭弹窗则禁止退出操作
        console.log('Cancel and Hold On!');
        isQuit = false; // 阻止执行退出
    }
}


// 保存文档，判断新文档or旧文档
function saveCurrentDoc() {
    // 新文档则执行弹窗保存操作
    if(!currentFile) {
        const options = {
            title: 'Save',
            filters: [
                { name: 'Text Files', extensions: ['txt', 'js', 'html', 'md'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        }
        const paths = dialog.showSaveDialogSync(remote.getCurrentWindow(), options);
        if(paths) {
            currentFile = paths;
        }
    }
    // 旧文档直接执行保存操作
    if(currentFile) {
        const txtSave = txtEditor.value;
        saveText(currentFile, txtSave);
        isSave = true;
        document.title = "Notepad - " + currentFile;
    }

}


// 选择文档路径
function openFile() {
    // 弹窗类型为openFile
    const options = {
        filters: [
            { name: 'Text Files', extensions: ['txt', 'js', 'html', 'md'] },
            { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
    }
    // 处理弹窗结果
    const file = dialog.showOpenDialogSync(remote.getCurrentWindow(), options);
    if(file) {
        currentFile = file[0];
        const txtRead = readText(currentFile);
        txtEditor.value = txtRead;
        document.title = 'Notepad - ' + currentFile;
        isSave = true;
    }

}


// 执行保存的方法
function saveText( file, text ) {
    const fs = require('fs');
    fs.writeFileSync( file, text );
}


// 读取文档方法
function readText(file) {
    const fs = require('fs');
    return fs.readFileSync(file, 'utf8');
}


// 字数统计
function wordsCount() {
    var str = txtEditor.value;
	sLen = 0;
	try{
		//先将回车换行符做特殊处理
   		str = str.replace(/(\r\n+|\s+|　+)/g,"龘");
		//处理英文字符数字，连续字母、数字、英文符号视为一个单词
		str = str.replace(/[\x00-\xff]/g,"m");	
		//合并字符m，连续字母、数字、英文符号视为一个单词
		str = str.replace(/m+/g,"*");
   		//去掉回车换行符
		str = str.replace(/龘+/g,"");
		//返回字数
		sLen = str.length;
	}catch(e){
		console.log(e);
    }
    // 刷新当前字数统计值到页面中
	document.getElementById("txtNum").innerHTML = sLen;
}


// 拖拽读取文档
const dragContent = document.querySelector('#txtEditor');
// 阻止 electron 默认事件
dragContent.ondragenter = dragContent.ondragover = dragContent.ondragleave = function() {
    return false;
}
// 拖拽事件执行
dragContent.ondrop = function(e) {
    e.preventDefault(); // 阻止默认事件
    currentFile = e.dataTransfer.files[0].path; // 获取文档路径
    const txtRead = readText(currentFile);
    txtEditor.value = txtRead;
    document.title = 'Notepad - ' + currentFile;
    isSave = true;
    wordsCount();
}