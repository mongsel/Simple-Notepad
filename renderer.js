const ipcRenderer = require('electron').ipcRenderer; // electron 通信模块
const remote = require('electron').remote; // electron 主进程与渲染进程通信模块
const Menu = remote.Menu; // electron renderer进程的菜单模块
const dialog = remote.dialog; // electron 对话框模块
const fs = require('fs'); // 引入 NodeJS 的 fs 模块
const shell = require('electron').shell;


// 读取保存数据
var data = fs.readFileSync('./data.json');
var myData = JSON.parse(data);
var themes = myData.theme;
if(themes == 'dark') {
    document.getElementById('theme_css').href = './styleDark.css';
} else {
    document.getElementById('theme_css').href = './style.css';
}
if(myData.isFull) {
    ipcRenderer.send('reqaction', 'win-max');
}


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
    { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectall' },
    { type: 'separator' },  //分隔线
    { label: 'DevTools', accelerator: 'CmdOrCtrl+I', 
        click: function() {
            remote.getCurrentWindow().openDevTools();
      }
    },
    { accelerator: 'CmdOrCtrl+R', role: 'reload' }
];
// 构建右键菜单
const contextMenu = Menu.buildFromTemplate(contextMenuTemplate);
txtEditor.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    contextMenu.popup(remote.getCurrentWindow());
});


// 右上角窗体操作按钮
function winCtrlBtn(id) {
    switch(id) {
        case 'win_min': // 最小化
            ipcRenderer.send('reqaction', 'win-min');
            break;
        case 'win_max': // 最大化
            ipcRenderer.send('reqaction', 'win-max');
            break;
        case 'win_close': // 退出
            askSaveNeed(); // 保证安全退出
            saveWinData(); // 保存窗体数据
            if(isQuit) { // 正常退出
                ipcRenderer.sendSync('reqaction', 'exit');
            }
            isQuit = true; // 复位正常退出
            break;
    }
}
// 监听窗口变化改变放大缩小按钮的图标
window.onresize = function () {
    if(remote.getCurrentWindow().isMaximized()) {
        document.getElementById('win_max').style.background = "url(images/ctrl-btn.png) no-repeat 0 -60px";
    }else {
        document.getElementById('win_max').style.background = "url(images/ctrl-btn.png) no-repeat 0 -30px";
    }
}

// 检测编辑器是否有内容更新，统计字数
txtEditor.oninput = (e) => {
    if (isSave) {
        document.title += ' *';
        document.getElementById("mainTitle").innerHTML = document.title;
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
            askSaveNeed(); // 安全退出
            saveWinData(); // 保存窗体数据
            if(isQuit) { // 正常退出
                ipcRenderer.sendSync('reqaction', 'exit');
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
	document.getElementById("mainTitle").innerHTML = document.title;
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
        document.getElementById("mainTitle").innerHTML = document.title;
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
        document.getElementById("mainTitle").innerHTML = document.title;
        isSave = true;
    }

}


// 执行保存的方法
function saveText( file, text ) {
    fs.writeFileSync( file, text );
}


// 读取文档方法
function readText(file) {
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
    askSaveNeed();
    currentFile = e.dataTransfer.files[0].path; // 获取文档路径
    const txtRead = readText(currentFile);
    txtEditor.value = txtRead;
    document.title = 'Notepad - ' + currentFile;
	document.getElementById("mainTitle").innerHTML = document.title;
    isSave = true;
    wordsCount();
}



// 主菜单事件
function showList(o) {
    hideList("dropdown-content" + o.id);
    document.getElementById("dropdown-" + o.id).classList.toggle("show");
    document.getElementById("a").setAttribute("onmousemove","showList(this)");
    document.getElementById("b").setAttribute("onmousemove","showList(this)");
    document.getElementById("c").setAttribute("onmousemove","showList(this)");
    // 判断点击背景采用的皮肤颜色
    var clickColor;
    if(themes == 'dark') {
        clickColor = '#505050';
    } else {
        clickColor = '#d5e9ff';
    }
    // 点击状态下背景色固定
    if(o.id == 'a') {
        document.getElementById('a').style.background = clickColor;
        document.getElementById('b').style.background = "";
        document.getElementById('c').style.background = "";
    }
    if(o.id == 'b') {
        document.getElementById('a').style.background = "";
        document.getElementById('b').style.background = clickColor;
        document.getElementById('c').style.background = "";
    }
    if(o.id == 'c') {
        document.getElementById('a').style.background = "";
        document.getElementById('b').style.background = "";
        document.getElementById('c').style.background = clickColor;
    }
}
 
// 主菜单隐藏操作
function hideList(option) {
    var dropdowns = document.getElementsByClassName("dropdown-content");
    for (var i = 0; i < dropdowns.length; i++) {
        var openDropdown = dropdowns[i];
        if (openDropdown.id != option) {
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}

// 主菜单点击复位操作
window.onclick = function(e) {
    if (!e.target.matches('.dropbtn')) {
        hideList("");
        document.getElementById("a").setAttribute("onmousemove","");
        document.getElementById("b").setAttribute("onmousemove","");
        document.getElementById("c").setAttribute("onmousemove","");
        document.getElementById("a").style.background = "";
        document.getElementById("b").style.background = "";
        document.getElementById("c").style.background = "";
    }
}

// 主菜单快捷键操作
function hotkey() {
    var key = window.event.keyCode;
    var keyCtrl;
    if((key == 70)&&(event.altKey)) {
        keyCtrl = document.getElementById("a");
        showList(keyCtrl);
    }
    if((key == 69)&&(event.altKey)) {
        keyCtrl = document.getElementById("b");
        showList(keyCtrl);
    }
    if((key == 72)&&(event.altKey)) {
        keyCtrl = document.getElementById("c");
        showList(keyCtrl);
    }
}
document.onkeydown = hotkey;


// 主菜单文件操作
function menuClick(arg) {
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
    }
}

// 主菜单编辑操作
function docCommand(arg) {
    switch(arg) {
        case 'undo': // 返回
            document.execCommand('Undo');
            break;
        case 'redo': // 重做
            document.execCommand('Redo');
            break;
        case 'cut': // 剪切
            document.execCommand('Cut', false, null);
            break;
        case 'copy': // 复制
            document.execCommand('Copy', false, null);
            break;
        case 'paste': // 粘贴
            document.execCommand('Paste', false, null);
            break;
        case 'delete': // 删除
            document.execCommand('Delete', false, null);
            break;
        case 'seletAll': // 全选
            document.execCommand('selectAll');
            break;
    }
}

// 主菜单中关于跳转
function aboutMe() {
    shell.openExternal('https://segmentfault.com/u/shaomeng');
}

//换肤
function theme() {
    if(themes == 'normal') {
        document.getElementById('theme_css').href = './styleDark.css';
        themes = 'dark';
    } else {
        document.getElementById('theme_css').href = './style.css';
        themes = 'normal';
    }
}

// 保存窗体相关数据
function saveWinData() {
    // 获取窗体相关数据
    var dF = remote.getCurrentWindow().isMaximized();
    var dX = dF == true ? myData.positionX : remote.getCurrentWindow().getPosition()[0];
    var dY = dF == true ? myData.positionY : remote.getCurrentWindow().getPosition()[1];
    var dWidth = dF == true ? myData.width : remote.getCurrentWindow().getSize()[0];
    var dHeight = dF == true ? myData.height : remote.getCurrentWindow().getSize()[1];
    // 数据合集
    var obj = {
        "isFull": dF,
        "positionX": dX,
        "positionY": dY,
        "width": dWidth,
        "height": dHeight,
        "theme": themes
    }
    // 格式化 json 数据
    var d = JSON.stringify(obj, null, '\t');
    // 写入文本
    fs.writeFileSync('./data.json', d);
}
