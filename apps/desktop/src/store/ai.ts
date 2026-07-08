import { create } from 'zustand'
import { getAiSocket, resetAiSocket } from '../lib/aiSocket'
import { makeLogger } from '../lib/logger'
import type { Socket } from 'socket.io-client'

const log = makeLogger('ai')

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
  status: 'running' | 'done' | 'error'
  result?: string
}

export interface AiAttachment {
  type: 'image' | 'file'
  name: string
  mediaType?: string
  data: string
  previewUrl?: string
}

export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  tools?: ToolCall[]
  attachments?: AiAttachment[]
}

export interface AiSession {
  id: string
  title: string
  messages: AiMessage[]
  createdAt: number
}

interface AiState {
  sessions: AiSession[]
  activeId: string
  streaming: boolean
  // Derived helpers
  activeSession: () => AiSession
  // Actions
  send: (text: string, attachments?: AiAttachment[]) => void
  newSession: () => void
  switchSession: (id: string) => void
  deleteSession: (id: string) => void
}

const uid = () => Math.random().toString(36).slice(2)

function makeSession(): AiSession {
  return { id: uid(), title: 'New chat', messages: [], createdAt: Date.now() }
}

const initial = makeSession()

let wiredSocket: Socket | null = null

function wireSocket(socket: Socket, get: () => AiState, set: (fn: (s: AiState) => Partial<AiState>) => void) {
  if (wiredSocket === socket) return
  log.event('wiring new socket', socket.id ?? '(connecting)')
  wiredSocket?.removeAllListeners()
  wiredSocket = socket

  socket.on('connect', () => log.info('socket connected', socket.id))

  const patchActive = (patcher: (msgs: AiMessage[]) => AiMessage[]) => {
    set(state => {
      const id = state.activeId
      return {
        sessions: state.sessions.map(s =>
          s.id === id ? { ...s, messages: patcher(s.messages) } : s
        )
      }
    })
  }

  socket.on('ai:chunk', (chunk: string) => {
    patchActive(msgs => {
      const copy = msgs.slice()
      const last = copy[copy.length - 1]
      if (last?.role === 'assistant') copy[copy.length - 1] = { ...last, text: last.text + chunk }
      return copy
    })
  })

  socket.on('ai:tool_start', ({ id, name, input }: { id: string; name: string; input: Record<string, unknown> }) => {
    patchActive(msgs => {
      const copy = msgs.slice()
      const last = copy[copy.length - 1]
      if (last?.role === 'assistant') {
        copy[copy.length - 1] = { ...last, tools: [...(last.tools ?? []), { id, name, input, status: 'running' as const }] }
      }
      return copy
    })
  })

  socket.on('ai:tool_done', ({ id, result }: { id: string; result: string }) => {
    patchActive(msgs => {
      const copy = msgs.slice()
      const last = copy[copy.length - 1]
      if (last?.role === 'assistant') {
        copy[copy.length - 1] = { ...last, tools: (last.tools ?? []).map(t => t.id === id ? { ...t, status: 'done' as const, result } : t) }
      }
      return copy
    })
  })

  socket.on('ai:done', () => {
    log.info('ai:done')
    set(() => ({ streaming: false }))
  })

  const onFail = (reason?: string) => {
    log.error('socket failed —', reason ?? 'connect_error')
    wiredSocket = null
    resetAiSocket()
    patchActive(msgs => {
      const copy = msgs.slice()
      const last = copy[copy.length - 1]
      if (last?.role === 'assistant' && !last.text) {
        copy[copy.length - 1] = { ...last, text: '⚠︎ Could not reach the assistant. Make sure the Bob server is running.' }
      }
      return copy
    })
    set(() => ({ streaming: false }))
  }

  socket.on('connect_error', (err) => onFail(err.message))
  socket.on('disconnect', (reason) => {
    log.warn('socket disconnected —', reason)
    if (reason !== 'io client disconnect') onFail()
  })
}

export const useAiStore = create<AiState>((set, get) => ({
  sessions: [initial],
  activeId: initial.id,
  streaming: false,

  activeSession: () => {
    const { sessions, activeId } = get()
    return sessions.find(s => s.id === activeId) ?? sessions[0]
  },

  send: (text: string, attachments: AiAttachment[] = []) => {
    const content = text.trim()
    if (!content && attachments.length === 0) return
    if (get().streaming) return

    const socket = getAiSocket()
    wireSocket(socket, get, set as Parameters<typeof wireSocket>[2])
    log.event('ai:message →', content.slice(0, 60))

    const activeId = get().activeId
    const session = get().activeSession()
    const prior = session.messages.filter(m => m.text).map(m => ({ role: m.role, content: m.text }))
    const wireAttachments = attachments.map(({ previewUrl: _, ...a }) => a)

    // Auto-title from first user message
    const isFirst = session.messages.length === 0
    const title = isFirst ? (content || 'File attached').slice(0, 40) : session.title

    set(state => ({
      streaming: true,
      sessions: state.sessions.map(s =>
        s.id === activeId ? {
          ...s,
          title,
          messages: [
            ...s.messages,
            { id: uid(), role: 'user' as const, text: content || '📎 File attached', attachments },
            { id: uid(), role: 'assistant' as const, text: '', tools: [] }
          ]
        } : s
      )
    }))

    socket.emit('ai:message', { content, history: prior, attachments: wireAttachments })
  },

  newSession: () => {
    const s = makeSession()
    set(state => ({ sessions: [s, ...state.sessions], activeId: s.id }))
    resetAiSocket()
    wiredSocket = null
  },

  switchSession: (id: string) => {
    set({ activeId: id })
    resetAiSocket()
    wiredSocket = null
  },

  deleteSession: (id: string) => {
    set(state => {
      const remaining = state.sessions.filter(s => s.id !== id)
      if (remaining.length === 0) {
        const fresh = makeSession()
        return { sessions: [fresh], activeId: fresh.id }
      }
      const newActive = state.activeId === id ? remaining[0].id : state.activeId
      return { sessions: remaining, activeId: newActive }
    })
  }
}))
