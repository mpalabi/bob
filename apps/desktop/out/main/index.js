"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const path = require("path");
const Store = require("electron-store");
const store = new Store();
let widgetWin = null;
let authWin = null;
let settingsWin = null;
let knowledgeWin = null;
let clipboardWin = null;
let taskIslandWin = null;
let tray = null;
const MAX_HISTORY = 50;
const clipboardHistory = [];
let lastClipboardText = "";
function startClipboardPolling() {
  setInterval(() => {
    try {
      const text = electron.clipboard.readText();
      if (text && text !== lastClipboardText) {
        lastClipboardText = text;
        clipboardHistory.unshift(text);
        if (clipboardHistory.length > MAX_HISTORY)
          clipboardHistory.pop();
      }
    } catch {
    }
  }, 500);
}
function copyToClipboard(text) {
  electron.clipboard.writeText(text);
  const idx = clipboardHistory.indexOf(text);
  if (idx > 0) {
    clipboardHistory.splice(idx, 1);
    clipboardHistory.unshift(text);
  }
  lastClipboardText = text;
}
const isDev = process.env.NODE_ENV === "development";
const rendererUrl = "http://localhost:5173";
const apiUrl = process.env.BOB_API_URL || "http://localhost:4233";
function rendererPath(hash) {
  return isDev ? `${rendererUrl}#${hash}` : `file://${path.join(__dirname, "../renderer/index.html")}#${hash}`;
}
function createWidgetWindow() {
  const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
  widgetWin = new electron.BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  widgetWin.setIgnoreMouseEvents(true, { forward: true });
  widgetWin.loadURL(rendererPath("widget"));
  widgetWin.on("closed", () => {
    widgetWin = null;
  });
}
function createAuthWindow() {
  if (authWin) {
    authWin.focus();
    return;
  }
  authWin = new electron.BrowserWindow({
    width: 440,
    height: 580,
    frame: false,
    resizable: false,
    center: true,
    show: false,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  authWin.loadURL(rendererPath("auth"));
  authWin.once("ready-to-show", () => authWin?.show());
  authWin.on("closed", () => {
    authWin = null;
  });
}
function createSettingsWindow() {
  if (settingsWin) {
    settingsWin.focus();
    return;
  }
  settingsWin = new electron.BrowserWindow({
    width: 680,
    height: 520,
    frame: false,
    resizable: false,
    center: true,
    show: false,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  settingsWin.loadURL(rendererPath("settings"));
  settingsWin.once("ready-to-show", () => {
    settingsWin?.show();
    const token = store.get("token");
    if (token)
      settingsWin?.webContents.send("auth:token", token);
  });
  settingsWin.on("closed", () => {
    settingsWin = null;
  });
}
function createKnowledgeWindow() {
  if (knowledgeWin) {
    knowledgeWin.focus();
    return;
  }
  knowledgeWin = new electron.BrowserWindow({
    width: 720,
    height: 560,
    frame: false,
    resizable: true,
    center: true,
    show: false,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  knowledgeWin.loadURL(rendererPath("knowledge"));
  knowledgeWin.once("ready-to-show", () => {
    knowledgeWin?.show();
    const token = store.get("token");
    if (token)
      knowledgeWin?.webContents.send("auth:token", token);
  });
  knowledgeWin.on("closed", () => {
    knowledgeWin = null;
  });
}
function createClipboardWindow(x, y) {
  if (clipboardWin && !clipboardWin.isDestroyed()) {
    clipboardWin.close();
    clipboardWin = null;
    return;
  }
  const WIN_WIDTH = 300;
  const WIN_HEIGHT = 48;
  const { bounds } = electron.screen.getDisplayNearestPoint({ x, y });
  const safeX = Math.min(Math.max(x - WIN_WIDTH / 2, bounds.x + 8), bounds.x + bounds.width - WIN_WIDTH - 8);
  const safeY = Math.min(Math.max(y - WIN_HEIGHT / 2, bounds.y + 8), bounds.y + bounds.height - WIN_HEIGHT - 8);
  clipboardWin = new electron.BrowserWindow({
    width: WIN_WIDTH,
    height: WIN_HEIGHT,
    x: Math.round(safeX),
    y: Math.round(safeY),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  clipboardWin.setAlwaysOnTop(true, "pop-up-menu");
  clipboardWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  clipboardWin.loadURL(rendererPath("clipboard"));
  clipboardWin.once("ready-to-show", () => {
    clipboardWin?.show();
    clipboardWin?.focus();
    clipboardWin?.webContents.send("clipboard:data", {
      history: clipboardHistory,
      current: clipboardHistory[0] ?? ""
    });
  });
  clipboardWin.on("blur", () => {
    if (clipboardWin && !clipboardWin.isDestroyed()) {
      clipboardWin.close();
      clipboardWin = null;
    }
  });
  clipboardWin.on("closed", () => {
    clipboardWin = null;
  });
}
function createTaskIslandWindow() {
  if (taskIslandWin && !taskIslandWin.isDestroyed())
    return taskIslandWin;
  const WIN_WIDTH = 440;
  const WIN_HEIGHT = 72;
  const primaryDisplay = electron.screen.getPrimaryDisplay();
  const { x, y, width } = primaryDisplay.bounds;
  const islandX = Math.round(x + width / 2 - WIN_WIDTH / 2);
  const islandY = y + 16;
  taskIslandWin = new electron.BrowserWindow({
    width: WIN_WIDTH,
    height: WIN_HEIGHT,
    x: islandX,
    y: islandY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  taskIslandWin.setAlwaysOnTop(true, "pop-up-menu");
  taskIslandWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  taskIslandWin.setIgnoreMouseEvents(false);
  taskIslandWin.loadURL(rendererPath("task-island"));
  taskIslandWin.on("closed", () => {
    taskIslandWin = null;
  });
  taskIslandWin.show();
  return taskIslandWin;
}
function createTray() {
  const iconPath = path.join(__dirname, "../../src/assets/icon.iconset/icon_32x32@2x.png");
  const icon = electron.nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  icon.setTemplateImage(true);
  tray = new electron.Tray(icon);
  tray.setToolTip("Bob");
  tray.setContextMenu(
    electron.Menu.buildFromTemplate([
      { label: "Show / Hide", click: toggleWidget },
      { label: "Settings", click: createSettingsWindow },
      { label: "Knowledge Base", click: createKnowledgeWindow },
      { type: "separator" },
      { label: "Quit", click: () => electron.app.quit() }
    ])
  );
  tray.on("click", toggleWidget);
}
function toggleWidget() {
  widgetWin?.webContents.send("widget:toggle");
}
const LABELS = {
  info: "\x1B[36m[renderer]\x1B[0m",
  warn: "\x1B[33m[renderer]\x1B[0m",
  error: "\x1B[31m[renderer]\x1B[0m",
  event: "\x1B[35m[renderer]\x1B[0m"
};
electron.ipcMain.on("log", (_e, level, window, ...args) => {
  const label = LABELS[level] ?? LABELS.info;
  const tag = `\x1B[90m[${window}]\x1B[0m`;
  const ts = (/* @__PURE__ */ new Date()).toLocaleTimeString();
  process.stdout.write(`${ts} ${label}${tag} ${args.map((a) => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ")}
`);
});
electron.ipcMain.on("set-ignore-mouse-events", (_e, ignore) => {
  widgetWin?.setIgnoreMouseEvents(ignore, { forward: true });
});
function applyToken(token) {
  store.set("token", token);
  authWin?.close();
  widgetWin?.webContents.send("auth:token", token);
}
electron.ipcMain.on("auth:success", (_e, token) => {
  applyToken(token);
});
function startGoogleOAuth() {
  const popup = new electron.BrowserWindow({
    width: 480,
    height: 660,
    center: true,
    show: false,
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  const successPrefix = `${apiUrl}/auth/google/success`;
  const handleUrl = (url) => {
    if (!url.startsWith(successPrefix))
      return false;
    const hash = url.split("#")[1] ?? "";
    const token = new URLSearchParams(hash).get("token");
    if (token)
      applyToken(token);
    if (!popup.isDestroyed())
      popup.close();
    return true;
  };
  popup.webContents.on("will-redirect", (e, url) => {
    if (handleUrl(url))
      e.preventDefault();
  });
  popup.webContents.on("will-navigate", (e, url) => {
    if (handleUrl(url))
      e.preventDefault();
  });
  popup.once("ready-to-show", () => popup.show());
  popup.loadURL(`${apiUrl}/auth/google`);
}
electron.ipcMain.on("auth:google", () => startGoogleOAuth());
electron.ipcMain.on("auth:logout", () => {
  store.delete("token");
  widgetWin?.webContents.send("auth:token", null);
  settingsWin?.close();
  createAuthWindow();
});
electron.ipcMain.on("window:settings", () => createSettingsWindow());
electron.ipcMain.on("window:auth", () => createAuthWindow());
electron.ipcMain.on("window:knowledge", () => createKnowledgeWindow());
electron.ipcMain.on("clipboard:close", () => {
  if (clipboardWin && !clipboardWin.isDestroyed()) {
    clipboardWin.close();
    clipboardWin = null;
  }
});
electron.ipcMain.on("clipboard:resize", (_e, height) => {
  if (clipboardWin && !clipboardWin.isDestroyed()) {
    clipboardWin.setSize(300, height, false);
  }
});
electron.ipcMain.handle("clipboard:copy", (_e, text) => {
  copyToClipboard(text);
  if (clipboardWin && !clipboardWin.isDestroyed()) {
    clipboardWin.close();
    clipboardWin = null;
  }
});
electron.ipcMain.on("task:island:set", (_e, task) => {
  const win = createTaskIslandWindow();
  const send = () => win.webContents.send("task:island:set", task);
  if (win.webContents.isLoading())
    win.webContents.once("did-finish-load", send);
  else
    send();
});
electron.ipcMain.on("task:island:dismiss", () => {
  if (taskIslandWin && !taskIslandWin.isDestroyed()) {
    taskIslandWin.close();
    taskIslandWin = null;
  }
});
electron.app.whenReady().then(() => {
  if (electron.app.dock) {
    const dockIcon = electron.nativeImage.createFromPath(
      path.join(__dirname, "../../src/assets/icon.icns")
    );
    electron.app.dock.setIcon(dockIcon);
  }
  createWidgetWindow();
  createTray();
  const token = store.get("token");
  if (!token)
    createAuthWindow();
  electron.globalShortcut.register("CommandOrControl+Shift+Space", toggleWidget);
  electron.globalShortcut.register("CommandOrControl+Shift+V", async () => {
    if (clipboardHistory.length === 0)
      return;
    const cursor = electron.screen.getCursorScreenPoint();
    createClipboardWindow(cursor.x, cursor.y);
  });
  startClipboardPolling();
  electron.app.on("activate", () => {
    if (!widgetWin)
      createWidgetWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin")
    electron.app.quit();
});
electron.app.on("will-quit", () => {
  electron.globalShortcut.unregisterAll();
});
exports.createAuthWindow = createAuthWindow;
exports.createKnowledgeWindow = createKnowledgeWindow;
exports.createSettingsWindow = createSettingsWindow;
