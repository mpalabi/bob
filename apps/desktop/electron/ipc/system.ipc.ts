import { ipcMain, app } from 'electron'

export function registerSystemIpc() {
  ipcMain.handle('system:version', () => app.getVersion())
  ipcMain.handle('system:platform', () => process.platform)
}
