import path from "path";
import electron, { app, ipcMain, shell } from "electron";
import { BrowserWindow as AcrylicBrowserWindow } from "electron-acrylic-window";
import { setupTitleBarHandler } from "./handle/handleTitleBar";
import { startGuardTask } from "./lcu/connector";
import installExtension from "electron-devtools-installer";
import logger from "./lib/logger";
import { getPath } from "./util/util";
import { initDb } from "./db";
import child_process from "child_process";
import { setupHandles } from "./handle";
import { setting } from "./config";

//解决有些电脑无法启动程序
app.commandLine.appendSwitch("--in-process-gpu");
const VUEJS3_DEVTOOLS = "nhdogjmejiglipccpnnnanhbledajbpd";

process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";

export const isWin11 = child_process
	.execSync("wmic os get Caption /value")
	.toString()
	.trim()
	.includes("Microsoft Windows 11");
// export const isWin11 = false;

ipcMain.on("checkIsWin11", (event, args) => {
	event.returnValue = isWin11;
});

process
	.on("unhandledRejection", (reason, p) => {
		logger.error("Unhandled Rejection at Promise", reason, p);
	})
	.on("uncaughtException", (err) => {
		logger.error(err);
		throw err;
	});

// The built directory structure
//
// ├─┬ dist
// │ ├─┬ electron
// │ │ ├── main.js
// │ │ └── preload.js
// │ ├── index.html
// │ ├── ...other-static-files-from-public
// │
process.env.DIST = path.join(getPath(), "../dist");
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, "../public");

type BrowserWindowAdapterType = typeof AcrylicBrowserWindow & typeof electron.BrowserWindow;
const BrowserWindowAdapter = (
	isWin11 ? require("electron-acrylic-window").BrowserWindow : require("electron").BrowserWindow
) as BrowserWindowAdapterType;
let win: AcrylicBrowserWindow & electron.BrowserWindow;

if (!app.requestSingleInstanceLock()) {
	app.quit();
	process.exit(0);
} else {
	app.on("second-instance", (event, commandLine, workingDirectory) => {
		// Someone tried to run a second instance, we should focus our window.
		win?.show();
	});
}

export async function createWindow() {
	win = new BrowserWindowAdapter({
		width: 800,
		height: 600,
		webPreferences: {
			nodeIntegration: true,
			preload: path.join(__dirname, "./preload.js")
		},
		titleBarStyle: "hidden",
		resizable: false,
		maximizable: false,
		fullscreenable: false,
		//transparent:true,
		vibrancy: {
			theme: "dark",
			effect: "acrylic",
			useCustomWindowRefreshMethod: true,
			disableOnBlur: true
		},
		show: false
	});
	//在加载页面时，渲染进程第一次完成绘制时，如果窗口还没有被显示，渲染进程会发出 ready-to-show 事件 。 在此事件后显示窗口将没有视觉闪烁：
	win.once("ready-to-show", () => {
		win.show();
	});
	// 当窗口准备完毕
	win.webContents.once("did-finish-load", async () => {
		logger.debug("webContents did-finish-load");
		startGuardTask();
	});

	if (process.env.VITE_DEV_SERVER_URL) {
		await win.loadURL(process.env.VITE_DEV_SERVER_URL);
		// 开发模式下自动打开开发者工具
		win.webContents.openDevTools();
	} else {
		await win.loadFile(path.join(process.env.DIST, "index.html"));
	}
	
	// 添加键盘快捷键处理（开发和生产环境都支持）
	win.webContents.on("before-input-event", (event: Electron.Event, input: Electron.Input) => {
		// F12 打开/关闭开发者工具
		if (input.key.toLowerCase() === "f12") {
			if (win.webContents.isDevToolsOpened()) {
				win.webContents.closeDevTools();
			} else {
				win.webContents.openDevTools();
			}
			event.preventDefault();
		}
		// 拦截快捷键Control+R（仅生产环境）
		if (!process.env.VITE_DEV_SERVER_URL && input.control && input.key.toLowerCase() === "r") {
			event.preventDefault();
		}
		// Ctrl+Shift+I 也可以打开开发者工具
		if (input.control && input.shift && input.key.toLowerCase() === "i") {
			if (win.webContents.isDevToolsOpened()) {
				win.webContents.closeDevTools();
			} else {
				win.webContents.openDevTools();
			}
			event.preventDefault();
		}
	});
	setupTitleBarHandler(win);
}

app.on("window-all-closed", () => {
	app.quit();
	win = null;
});

ipcMain.on("open-url", (e, args) => {
	void shell.openExternal(args);
});

app.whenReady().then(() => {
  initDb();
  setting.loadSetting();
	void createWindow();
	setupHandles();
	if (process.env.VITE_DEV_SERVER_URL) {
		installExtension(VUEJS3_DEVTOOLS)
			.then((name) => logger.debug(`Added Extension:  ${name}`))
			.catch((err) => logger.debug("An error occurred: ", err));
	}
});
