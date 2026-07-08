import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,

  // Mouse passthrough control
  setIgnoreMouseEvents: (ignore: boolean) =>
    ipcRenderer.send('set-ignore-mouse-events', ignore),

  // Widget toggle from main process (hotkey / tray)
  onToggle: (cb: () => void) =>
    ipcRenderer.on('widget:toggle', () => cb()),

  // Auth
  authSuccess: (token: string) =>
    ipcRenderer.send('auth:success', token),
  onAuthToken: (cb: (token: string | null) => void) =>
    ipcRenderer.on('auth:token', (_e, token) => cb(token)),
  signInWithGoogle: () =>
    ipcRenderer.send('auth:google'),
  logout: () =>
    ipcRenderer.send('auth:logout'),

  // Open other windows from renderer
  openSettings: () => ipcRenderer.send('window:settings'),
  openAuth: () => ipcRenderer.send('window:auth'),
  openKnowledge: () => ipcRenderer.send('window:knowledge'),

  // Renderer → main logging
  log: (level: string, window: string, ...args: unknown[]) =>
    ipcRenderer.send('log', level, window, ...args),

  // Clipboard manager
  onClipboardData: (cb: (data: { history: string[]; current: string }) => void) =>
    ipcRenderer.on('clipboard:data', (_e, data) => cb(data)),
  clipboardClose: () => ipcRenderer.send('clipboard:close'),
  clipboardResize: (height: number) => ipcRenderer.send('clipboard:resize', height),
  clipboardCopy: (text: string) => ipcRenderer.invoke('clipboard:copy', text),

  // Task island
  taskIslandSet: (task: { id: string; title: string; priority?: string }) =>
    ipcRenderer.send('task:island:set', task),
  taskIslandDismiss: () =>
    ipcRenderer.send('task:island:dismiss'),
  onTaskIslandSet: (cb: (task: { id: string; title: string; priority?: string }) => void) =>
    ipcRenderer.on('task:island:set', (_e, task) => cb(task)),

  // Generic
  send: (channel: string, data?: unknown) =>
    ipcRenderer.send(channel, data),
  on: (channel: string, cb: (...args: unknown[]) => void) =>
    ipcRenderer.on(channel, (_e, ...args) => cb(...args)),
  removeAllListeners: (channel: string) =>
    ipcRenderer.removeAllListeners(channel)
})
