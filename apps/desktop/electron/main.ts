import {
  app,
  BrowserWindow,
  globalShortcut,
  Tray,
  Menu,
  nativeImage,
  screen,
  ipcMain,
  clipboard
} from 'electron'
import { join } from 'path'
import Store from 'electron-store'

const store = new Store<{ token: string | null }>()

let widgetWin: BrowserWindow | null = null
let authWin: BrowserWindow | null = null
let settingsWin: BrowserWindow | null = null
let knowledgeWin: BrowserWindow | null = null
let clipboardWin: BrowserWindow | null = null
let taskIslandWin: BrowserWindow | null = null
let tray: Tray | null = null

// ─── Clipboard history ────────────────────────────────────────────────────────

const MAX_HISTORY = 50
const clipboardHistory: string[] = []
let lastClipboardText = ''

function startClipboardPolling() {
  setInterval(() => {
    try {
      const text = clipboard.readText()
      if (text && text !== lastClipboardText) {
        lastClipboardText = text
        clipboardHistory.unshift(text)
        if (clipboardHistory.length > MAX_HISTORY) clipboardHistory.pop()
      }
    } catch { /* ignore */ }
  }, 500)
}

function copyToClipboard(text: string): void {
  clipboard.writeText(text)
  const idx = clipboardHistory.indexOf(text)
  if (idx > 0) { clipboardHistory.splice(idx, 1); clipboardHistory.unshift(text) }
  lastClipboardText = text
}

const isDev = process.env.NODE_ENV === 'development'
const rendererUrl = 'http://localhost:5173'
const apiUrl = process.env.BOB_API_URL || 'http://localhost:4233'

function rendererPath(hash: string) {
  return isDev ? `${rendererUrl}#${hash}` : `file://${join(__dirname, '../renderer/index.html')}#${hash}`
}

// ─── Widget Window ────────────────────────────────────────────────────────────

function createWidgetWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  widgetWin = new BrowserWindow({
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
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  widgetWin.setIgnoreMouseEvents(true, { forward: true })
  widgetWin.loadURL(rendererPath('widget'))
  widgetWin.on('closed', () => { widgetWin = null })
}

// ─── Auth Window ──────────────────────────────────────────────────────────────

export function createAuthWindow() {
  if (authWin) { authWin.focus(); return }

  authWin = new BrowserWindow({
    width: 440,
    height: 580,
    frame: false,
    resizable: false,
    center: true,
    show: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  authWin.loadURL(rendererPath('auth'))
  authWin.once('ready-to-show', () => authWin?.show())
  authWin.on('closed', () => { authWin = null })
}

// ─── Settings Window ──────────────────────────────────────────────────────────

export function createSettingsWindow() {
  if (settingsWin) { settingsWin.focus(); return }

  settingsWin = new BrowserWindow({
    width: 680,
    height: 520,
    frame: false,
    resizable: false,
    center: true,
    show: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  settingsWin.loadURL(rendererPath('settings'))
  settingsWin.once('ready-to-show', () => {
    settingsWin?.show()
    // Inject the stored token so the settings renderer can authenticate API calls.
    const token = store.get('token')
    if (token) settingsWin?.webContents.send('auth:token', token)
  })
  settingsWin.on('closed', () => { settingsWin = null })
}

// ─── Knowledge Window ─────────────────────────────────────────────────────────

export function createKnowledgeWindow() {
  if (knowledgeWin) { knowledgeWin.focus(); return }

  knowledgeWin = new BrowserWindow({
    width: 720,
    height: 560,
    frame: false,
    resizable: true,
    center: true,
    show: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  knowledgeWin.loadURL(rendererPath('knowledge'))
  knowledgeWin.once('ready-to-show', () => {
    knowledgeWin?.show()
    const token = store.get('token')
    if (token) knowledgeWin?.webContents.send('auth:token', token)
  })
  knowledgeWin.on('closed', () => { knowledgeWin = null })
}

// ─── Clipboard Window ─────────────────────────────────────────────────────────

function createClipboardWindow(x: number, y: number) {
  if (clipboardWin && !clipboardWin.isDestroyed()) {
    clipboardWin.close()
    clipboardWin = null
    return
  }

  const WIN_WIDTH = 300
  const WIN_HEIGHT = 48 // collapsed pill height

  const { bounds } = screen.getDisplayNearestPoint({ x, y })
  const safeX = Math.min(Math.max(x - WIN_WIDTH / 2, bounds.x + 8), bounds.x + bounds.width - WIN_WIDTH - 8)
  const safeY = Math.min(Math.max(y - WIN_HEIGHT / 2, bounds.y + 8), bounds.y + bounds.height - WIN_HEIGHT - 8)

  clipboardWin = new BrowserWindow({
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
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // Make visible on all spaces/screens on macOS
  clipboardWin.setAlwaysOnTop(true, 'pop-up-menu')
  clipboardWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  clipboardWin.loadURL(rendererPath('clipboard'))
  clipboardWin.once('ready-to-show', () => {
    clipboardWin?.show()
    clipboardWin?.focus()
    clipboardWin?.webContents.send('clipboard:data', {
      history: clipboardHistory,
      current: clipboardHistory[0] ?? ''
    })
  })
  clipboardWin.on('blur', () => {
    if (clipboardWin && !clipboardWin.isDestroyed()) {
      clipboardWin.close()
      clipboardWin = null
    }
  })
  clipboardWin.on('closed', () => { clipboardWin = null })
}

// ─── Task Island Window ───────────────────────────────────────────────────────

function createTaskIslandWindow() {
  if (taskIslandWin && !taskIslandWin.isDestroyed()) return taskIslandWin

  const WIN_WIDTH = 440
  const WIN_HEIGHT = 72

  const primaryDisplay = screen.getPrimaryDisplay()
  const { x, y, width } = primaryDisplay.bounds
  const islandX = Math.round(x + width / 2 - WIN_WIDTH / 2)
  const islandY = y + 16

  taskIslandWin = new BrowserWindow({
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
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  taskIslandWin.setAlwaysOnTop(true, 'pop-up-menu')
  taskIslandWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  taskIslandWin.setIgnoreMouseEvents(false)
  taskIslandWin.loadURL(rendererPath('task-island'))
  taskIslandWin.on('closed', () => { taskIslandWin = null })
  taskIslandWin.show()

  return taskIslandWin
}

// ─── Tray ─────────────────────────────────────────────────────────────────────

function createTray() {
  const iconPath = join(__dirname, '../../src/assets/icon.iconset/icon_32x32@2x.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  icon.setTemplateImage(true) // makes it adapt to light/dark menu bar
  tray = new Tray(icon)
  tray.setToolTip('Bob')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show / Hide', click: toggleWidget },
      { label: 'Settings', click: createSettingsWindow },
      { label: 'Knowledge Base', click: createKnowledgeWindow },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ])
  )
  tray.on('click', toggleWidget)
}

function toggleWidget() {
  widgetWin?.webContents.send('widget:toggle')
}

// ─── Renderer logging ─────────────────────────────────────────────────────────
// Receives structured log events from any renderer window and prints them to
// the terminal so they appear in /tmp/bob-desktop.log alongside build output.

const LABELS: Record<string, string> = {
  info:  '\x1b[36m[renderer]\x1b[0m',
  warn:  '\x1b[33m[renderer]\x1b[0m',
  error: '\x1b[31m[renderer]\x1b[0m',
  event: '\x1b[35m[renderer]\x1b[0m',
}

ipcMain.on('log', (_e, level: string, window: string, ...args: unknown[]) => {
  const label = LABELS[level] ?? LABELS.info
  const tag = `\x1b[90m[${window}]\x1b[0m`
  const ts = new Date().toLocaleTimeString()
  process.stdout.write(`${ts} ${label}${tag} ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}\n`)
})

// ─── IPC ──────────────────────────────────────────────────────────────────────

ipcMain.on('set-ignore-mouse-events', (_e, ignore: boolean) => {
  widgetWin?.setIgnoreMouseEvents(ignore, { forward: true })
})

// Persist a fresh token, close the auth window, and hand the token to the
// widget (it writes it into the shared localStorage and restores the session).
function applyToken(token: string) {
  store.set('token', token)
  authWin?.close()
  widgetWin?.webContents.send('auth:token', token)
}

// Auth completed — close auth window, show widget
ipcMain.on('auth:success', (_e, token: string) => {
  applyToken(token)
})

// Google OAuth — open the provider consent flow in a popup window, then
// intercept the backend's success redirect to capture our own JWT from the
// URL fragment (#token=...). No tokens are exposed to the renderer's JS.
function startGoogleOAuth() {
  const popup = new BrowserWindow({
    width: 480,
    height: 660,
    center: true,
    show: false,
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  })

  const successPrefix = `${apiUrl}/auth/google/success`

  const handleUrl = (url: string): boolean => {
    if (!url.startsWith(successPrefix)) return false
    const hash = url.split('#')[1] ?? ''
    const token = new URLSearchParams(hash).get('token')
    if (token) applyToken(token)
    if (!popup.isDestroyed()) popup.close()
    return true
  }

  popup.webContents.on('will-redirect', (e, url) => { if (handleUrl(url)) e.preventDefault() })
  popup.webContents.on('will-navigate', (e, url) => { if (handleUrl(url)) e.preventDefault() })
  popup.once('ready-to-show', () => popup.show())
  popup.loadURL(`${apiUrl}/auth/google`)
}

ipcMain.on('auth:google', () => startGoogleOAuth())

// Auth logout — clear token, notify widget to drop its session, open auth window
ipcMain.on('auth:logout', () => {
  store.delete('token')
  widgetWin?.webContents.send('auth:token', null)
  settingsWin?.close()
  createAuthWindow()
})

// Open windows from renderer
ipcMain.on('window:settings', () => createSettingsWindow())
ipcMain.on('window:auth', () => createAuthWindow())
ipcMain.on('window:knowledge', () => createKnowledgeWindow())

// Clipboard
ipcMain.on('clipboard:close', () => {
  if (clipboardWin && !clipboardWin.isDestroyed()) {
    clipboardWin.close()
    clipboardWin = null
  }
})

ipcMain.on('clipboard:resize', (_e, height: number) => {
  if (clipboardWin && !clipboardWin.isDestroyed()) {
    clipboardWin.setSize(300, height, false)
  }
})

ipcMain.handle('clipboard:copy', (_e, text: string) => {
  copyToClipboard(text)
  if (clipboardWin && !clipboardWin.isDestroyed()) {
    clipboardWin.close()
    clipboardWin = null
  }
})

// Task island
ipcMain.on('task:island:set', (_e, task: { id: string; title: string; priority?: string }) => {
  const win = createTaskIslandWindow()
  const send = () => win.webContents.send('task:island:set', task)
  if (win.webContents.isLoading()) win.webContents.once('did-finish-load', send)
  else send()
})

ipcMain.on('task:island:dismiss', () => {
  if (taskIslandWin && !taskIslandWin.isDestroyed()) {
    taskIslandWin.close()
    taskIslandWin = null
  }
})

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  // Set dock icon
  if (app.dock) {
    const dockIcon = nativeImage.createFromPath(
      join(__dirname, '../../src/assets/icon.icns')
    )
    app.dock.setIcon(dockIcon)
  }

  createWidgetWindow()
  createTray()

  // If no stored token, open auth immediately
  const token = store.get('token')
  if (!token) createAuthWindow()

  globalShortcut.register('CommandOrControl+Shift+Space', toggleWidget)

  // Clipboard manager hotkey — Cmd+Shift+V
  globalShortcut.register('CommandOrControl+Shift+V', async () => {
    if (clipboardHistory.length === 0) return
    const cursor = screen.getCursorScreenPoint()
    createClipboardWindow(cursor.x, cursor.y)
  })

  startClipboardPolling()

  app.on('activate', () => {
    if (!widgetWin) createWidgetWindow()
  })
})

app.on('window-all-closed', () => {
  // Keep the app alive even when all windows are closed (tray app)
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
