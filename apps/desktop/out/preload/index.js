"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  platform: process.platform,
  // Mouse passthrough control
  setIgnoreMouseEvents: (ignore) => electron.ipcRenderer.send("set-ignore-mouse-events", ignore),
  // Widget toggle from main process (hotkey / tray)
  onToggle: (cb) => electron.ipcRenderer.on("widget:toggle", () => cb()),
  // Auth
  authSuccess: (token) => electron.ipcRenderer.send("auth:success", token),
  onAuthToken: (cb) => electron.ipcRenderer.on("auth:token", (_e, token) => cb(token)),
  signInWithGoogle: () => electron.ipcRenderer.send("auth:google"),
  logout: () => electron.ipcRenderer.send("auth:logout"),
  // Open other windows from renderer
  openSettings: () => electron.ipcRenderer.send("window:settings"),
  openAuth: () => electron.ipcRenderer.send("window:auth"),
  openKnowledge: () => electron.ipcRenderer.send("window:knowledge"),
  // Renderer → main logging
  log: (level, window, ...args) => electron.ipcRenderer.send("log", level, window, ...args),
  // Clipboard manager
  onClipboardData: (cb) => electron.ipcRenderer.on("clipboard:data", (_e, data) => cb(data)),
  clipboardClose: () => electron.ipcRenderer.send("clipboard:close"),
  clipboardResize: (height) => electron.ipcRenderer.send("clipboard:resize", height),
  clipboardCopy: (text) => electron.ipcRenderer.invoke("clipboard:copy", text),
  // Task island
  taskIslandSet: (task) => electron.ipcRenderer.send("task:island:set", task),
  taskIslandDismiss: () => electron.ipcRenderer.send("task:island:dismiss"),
  onTaskIslandSet: (cb) => electron.ipcRenderer.on("task:island:set", (_e, task) => cb(task)),
  // Generic
  send: (channel, data) => electron.ipcRenderer.send(channel, data),
  on: (channel, cb) => electron.ipcRenderer.on(channel, (_e, ...args) => cb(...args)),
  removeAllListeners: (channel) => electron.ipcRenderer.removeAllListeners(channel)
});
