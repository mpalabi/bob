import { ipcMain, desktopCapturer } from 'electron'

export function registerScreenIpc() {
  ipcMain.handle('screen:sources', async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] })
    return sources.map(s => ({ id: s.id, name: s.name }))
  })
}
