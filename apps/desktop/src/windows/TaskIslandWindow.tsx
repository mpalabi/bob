import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface ActiveTask {
  id: string
  title: string
  priority?: string
}

export function TaskIslandWindow() {
  const [task, setTask] = useState<ActiveTask | null>(null)
  const [visible, setVisible] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    window.electron?.onTaskIslandSet((t) => {
      setDone(false)
      setCompleting(false)
      setTask(t)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    })
    return () => window.electron?.removeAllListeners('task:island:set')
  }, [])

  const dismiss = () => {
    setVisible(false)
    setTimeout(() => {
      setTask(null)
      window.electron?.taskIslandDismiss()
    }, 300)
  }

  const complete = async () => {
    if (!task || completing) return
    setCompleting(true)
    try {
      await api.patch(`/tasks/${task.id}`, { status: 'done' })
      setDone(true)
      setTimeout(dismiss, 1200)
    } catch {
      setCompleting(false)
    }
  }

  if (!task) return null

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: '#111111',
        borderRadius: 100,
        padding: '0 6px 0 10px',
        height: 44,
        maxWidth: 400,
        minWidth: 200,
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(-8px)',
        transition: 'opacity 0.25s cubic-bezier(0.34,1.56,0.64,1), transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      }}>

        {/* Left — status dot */}
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: done ? 'rgba(74,222,128,0.15)' : 'rgba(96,165,250,0.15)',
          transition: 'background 0.3s',
        }}>
          {done ? (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2.5 6.5L5.5 9.5L10.5 4" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            // Current task icon — bullseye/target
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#60a5fa" strokeWidth="1.5"/>
              <circle cx="7" cy="7" r="3" stroke="#60a5fa" strokeWidth="1.5"/>
              <circle cx="7" cy="7" r="1" fill="#60a5fa"/>
            </svg>
          )}
        </div>

        {/* Title */}
        <span style={{
          color: '#ffffff',
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 260,
          flex: 1,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          opacity: done ? 0.5 : 1,
          transition: 'opacity 0.3s',
          textDecoration: done ? 'line-through' : 'none',
        }}>
          {task.title}
        </span>

        {/* Right — complete button */}
        <button
          onClick={complete}
          disabled={done || completing}
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: 'none',
            cursor: done ? 'default' : 'pointer',
            background: done ? '#22c55e' : '#222222',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.3s cubic-bezier(0.34,1.56,0.64,1), transform 0.15s',
            transform: completing && !done ? 'scale(0.9)' : 'scale(1)',
          }}
          onMouseEnter={e => { if (!done) (e.currentTarget as HTMLButtonElement).style.background = '#2d6a4f' }}
          onMouseLeave={e => { if (!done) (e.currentTarget as HTMLButtonElement).style.background = '#222222' }}
          title="Mark as done"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path
              d="M2.5 6.5L5.5 9.5L10.5 4"
              stroke={done ? '#fff' : '#888'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: 'stroke 0.3s' }}
            />
          </svg>
        </button>

        {/* Dismiss × */}
        {!done && (
          <button
            onClick={dismiss}
            style={{
              flexShrink: 0,
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: -4,
              marginRight: 2,
            }}
            title="Dismiss"
          >
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M1.5 1.5L7.5 7.5M7.5 1.5L1.5 7.5" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
