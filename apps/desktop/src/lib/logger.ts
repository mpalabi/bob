// Sends log events to the Electron main process so they appear in the terminal.
// Falls back to console.* so it works in a plain browser context too.

function send(level: 'info' | 'warn' | 'error' | 'event', win: string, ...args: unknown[]) {
  if (window.electron?.log) {
    window.electron.log(level, win, ...args)
  } else {
    console[level === 'event' ? 'log' : level](`[${win}]`, ...args)
  }
}

export function makeLogger(win: string) {
  return {
    info:  (...args: unknown[]) => send('info',  win, ...args),
    warn:  (...args: unknown[]) => send('warn',  win, ...args),
    error: (...args: unknown[]) => send('error', win, ...args),
    event: (...args: unknown[]) => send('event', win, ...args),
  }
}
