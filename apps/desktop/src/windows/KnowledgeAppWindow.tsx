import { useEffect } from 'react'
import { BookOpen, X } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import KnowledgeModule from '../modules/knowledge'

export function KnowledgeAppWindow() {
  const restore = useAuthStore(s => s.restore)

  useEffect(() => {
    restore()
    window.electron?.onAuthToken(token => {
      try {
        if (token) localStorage.setItem('bob_token', token)
        else localStorage.removeItem('bob_token')
      } catch { /* ignore */ }
      restore()
    })
    return () => window.electron?.removeAllListeners('auth:token')
  }, [restore])

  return (
    <div className="flex flex-col h-screen bg-bg-base text-text-primary font-sans overflow-hidden">
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-4 h-12 flex-shrink-0 border-b border-border select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <BookOpen size={15} className="text-text-tertiary" />
          <span className="text-sm font-semibold text-text-primary">Knowledge Base</span>
        </div>
        <button
          onClick={() => window.close()}
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary
                     hover:bg-bg-subtle hover:text-text-primary transition-colors"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <X size={14} />
        </button>
      </div>

      {/* Knowledge module fills the rest */}
      <div className="flex-1 overflow-hidden">
        <KnowledgeModule />
      </div>
    </div>
  )
}
