export {}

declare global {
  interface Window {
    electron?: {
      platform: string
      setIgnoreMouseEvents: (ignore: boolean) => void
      onToggle: (cb: () => void) => void
      authSuccess: (token: string) => void
      onAuthToken: (cb: (token: string | null) => void) => void
      signInWithGoogle: () => void
      logout: () => void
      openSettings: () => void
      openAuth: () => void
      openKnowledge: () => void
      log: (level: string, window: string, ...args: unknown[]) => void
      onClipboardData: (cb: (data: { history: string[]; current: string }) => void) => void
      clipboardClose: () => void
      clipboardResize: (height: number) => void
      clipboardCopy: (text: string) => Promise<void>
      taskIslandSet: (task: { id: string; title: string; priority?: string }) => void
      taskIslandDismiss: () => void
      onTaskIslandSet: (cb: (task: { id: string; title: string; priority?: string }) => void) => void
      send: (channel: string, data?: unknown) => void
      on: (channel: string, cb: (...args: unknown[]) => void) => void
      removeAllListeners: (channel: string) => void
    }
  }
}
