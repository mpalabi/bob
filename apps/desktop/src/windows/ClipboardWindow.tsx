import { useEffect, useRef, useState, useCallback } from 'react'
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'

const ITEM_HEIGHT = 40
const COLLAPSED_HEIGHT = 48
const MAX_VISIBLE = 6

function truncate(text: string, max = 60) {
  return text.length > max ? text.slice(0, max) + '…' : text
}

export function ClipboardWindow() {
  const [history, setHistory] = useState<string[]>([])
  const [current, setCurrent] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.electron?.onClipboardData(({ history: h, current: c }) => {
      setHistory(h)
      setCurrent(c)
      setSelectedIdx(0)
    })
    return () => window.electron?.removeAllListeners('clipboard:data')
  }, [])

  const collapse = useCallback(() => {
    setExpanded(false)
    window.electron?.clipboardResize(COLLAPSED_HEIGHT)
  }, [])

  const expand = useCallback((len: number) => {
    setExpanded(true)
    const height = COLLAPSED_HEIGHT + Math.min(len, MAX_VISIBLE) * ITEM_HEIGHT
    window.electron?.clipboardResize(height)
  }, [])

  const toggleExpand = useCallback(() => {
    if (expanded) collapse()
    else expand(history.length)
  }, [expanded, collapse, expand, history.length])

  const copyItem = useCallback((text: string, idx: number) => {
    window.electron?.clipboardCopy(text)
    setCopiedIdx(idx)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { window.electron?.clipboardClose(); return }
      if (e.key === 'Enter') {
        const target = expanded && history[selectedIdx] ? history[selectedIdx] : current
        if (target) copyItem(target, expanded ? selectedIdx : -1)
        return
      }
      if (!expanded) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, history.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded, current, history, selectedIdx, copyItem])

  if (!current) return null

  const visibleHistory = history.slice(0, MAX_VISIBLE)

  return (
    <div
      ref={containerRef}
      className="select-none font-sans"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between cursor-default"
        style={{
          height: COLLAPSED_HEIGHT,
          padding: '0 6px 0 14px',
          background: '#111111',
          borderRadius: expanded ? '8px 8px 0 0' : 8,
          transition: 'border-radius 0.15s ease',
        }}
      >
        <span
          className="text-white font-medium truncate flex-1 pr-2"
          style={{ fontSize: 13, letterSpacing: '-0.01em' }}
        >
          {truncate(current, 36)}
        </span>
        <div className="flex items-center gap-1">
          <button
            className="flex items-center justify-center shrink-0 cursor-pointer"
            style={{ width: 32, height: 32, background: '#2a2a2a', borderRadius: 6 }}
            onClick={() => copyItem(current, -1)}
            title="Copy (then paste with ⌘V)"
          >
            {copiedIdx === -1
              ? <Check size={13} color="#6ee7b7" strokeWidth={2.5} />
              : <Copy size={13} color="#ffffff" strokeWidth={2.5} />
            }
          </button>
          <button
            className="flex items-center justify-center shrink-0 cursor-pointer"
            style={{ width: 32, height: 32, background: '#2a2a2a', borderRadius: 6 }}
            onClick={toggleExpand}
          >
            {expanded
              ? <ChevronUp size={14} color="#ffffff" strokeWidth={2.5} />
              : <ChevronDown size={14} color="#ffffff" strokeWidth={2.5} />
            }
          </button>
        </div>
      </div>

      {/* History list */}
      {expanded && (
        <div style={{ background: '#111111', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
          {visibleHistory.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center cursor-pointer group"
              style={{
                height: ITEM_HEIGHT,
                padding: '0 6px 0 14px',
                background: idx === selectedIdx ? '#1e1e1e' : 'transparent',
                borderTop: '1px solid #1a1a1a',
                transition: 'background 0.1s',
              }}
              onMouseEnter={() => setSelectedIdx(idx)}
            >
              <span
                className="text-white truncate flex-1"
                style={{ fontSize: 13, opacity: idx === 0 ? 1 : 0.65 }}
              >
                {truncate(item, 46)}
              </span>
              <button
                className="flex items-center justify-center shrink-0 cursor-pointer ml-2"
                style={{ width: 26, height: 26, background: '#2a2a2a', borderRadius: 5 }}
                onClick={(e) => { e.stopPropagation(); copyItem(item, idx) }}
                title="Copy"
              >
                {copiedIdx === idx
                  ? <Check size={11} color="#6ee7b7" strokeWidth={2.5} />
                  : <Copy size={11} color="#888" strokeWidth={2.5} />
                }
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
