import { useEffect, useMemo, useState } from 'react'
import { Launcher } from './Launcher'
import { WidgetPanel } from './WidgetPanel'
import { SearchResults } from './SearchResults'
import { type Contact } from '../lib/contacts'
import { useChatStore } from '../store/chat'
import { useAuthStore } from '../store/auth'
import { cn } from '../lib/utils'
import { makeLogger } from '../lib/logger'

const log = makeLogger('widget')

const PANEL_WIDTH = 380
const PANEL_HEIGHT = 420
const MARGIN = 20

export function Widget() {
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')

  const restore = useAuthStore(s => s.restore)
  const status = useAuthStore(s => s.status)
  const initChat = useChatStore(s => s.init)
  const users = useChatStore(s => s.users)

  useEffect(() => {
    window.electron?.onToggle(() => setOpen(v => !v))
  }, [])

  // Restore the session on launch, and re-restore whenever the auth window
  // completes sign-in (main forwards the fresh token to this window).
  useEffect(() => {
    restore()
    // The main process forwards tokens here after login/logout.
    // A null token means the user logged out from another window.
    window.electron?.onAuthToken((token) => {
      log.event('auth:token received from main — present:', !!token)
      try {
        if (token) localStorage.setItem('bob_token', token)
        else localStorage.removeItem('bob_token')
      } catch { /* ignore */ }
      restore()
    })
    return () => window.electron?.removeAllListeners('auth:token')
  }, [restore])

  // Open the auth window whenever there's no valid session.
  useEffect(() => {
    log.event('auth status →', status)
    if (status === 'unauthenticated') {
      log.info('no session — opening auth window')
      window.electron?.openAuth()
    }
  }, [status])

  // Once authenticated, connect the realtime socket and load contacts.
  useEffect(() => {
    if (status === 'authenticated') initChat()
  }, [status, initChat])

  // Track cursor position via mousemove (fires even when setIgnoreMouseEvents(true, {forward:true}))
  // and toggle mouse capture only when the cursor is actually over a widget element.
  // This replaces the unreliable onMouseEnter/onMouseLeave approach on a pointer-events:none div.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const over = el ? el.closest('[data-widget]') !== null : false
      window.electron?.setIgnoreMouseEvents(!over)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? users.filter(u => u.name.toLowerCase().includes(q)) : users
  }, [query, users])
  const openChat = useChatStore(s => s.openChat)

  // Keep `open` true through search so closing search returns to the panel it started from.
  const startSearch = () => { setOpen(true); setSearching(true) }
  const endSearch = () => { setSearching(false); setQuery('') }

  // Picking a search result opens that person's chat in the panel.
  const handleSelect = (contact: Contact) => {
    openChat(contact)
    setOpen(true)
    endSearch()
  }

  const panelVisible = open && !searching

  return (
    <div
      data-widget
      className="flex flex-col items-end gap-3"
      style={{
        position: 'fixed',
        bottom: MARGIN,
        right: MARGIN,
        width: PANEL_WIDTH,
        pointerEvents: 'none',
        zIndex: 9999
      }}
    >
      {/* Top slot — holds the contacts panel or the search results.
          The slot itself is click-through; only the visible content captures events. */}
      <div className="relative w-full" style={{ height: PANEL_HEIGHT, pointerEvents: 'none' }}>
        {/* Contacts panel */}
        <div
          className={cn(
            'absolute inset-0 transition-all duration-300 ease-out origin-bottom-right',
            panelVisible ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
          )}
        >
          <WidgetPanel open={open} onClose={() => setOpen(false)} onSearch={startSearch} />
        </div>

        {/* Search results — anchored just above the input, animates up */}
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 transition-all duration-300 ease-out origin-bottom-right',
            searching ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
          )}
        >
          <SearchResults results={results} onSelect={handleSelect} />
        </div>
      </div>

      {/* Launcher — morphs between Bob and the search input */}
      <div style={{ pointerEvents: 'auto' }}>
        <Launcher
          expandedWidth={PANEL_WIDTH}
          searching={searching}
          query={query}
          panelOpen={open}
          onQueryChange={setQuery}
          onToggle={() => setOpen(v => !v)}
          onCloseSearch={endSearch}
        />
      </div>
    </div>
  )
}
