import { create } from 'zustand'
import type { DirectMessage, UserPresence, UserWithPresence } from '@bob/shared'
import { api } from '../lib/api'
import { connectSocket, getSocket } from '../lib/socket'
import { presenceToStatus, toContact, type Contact } from '../lib/contacts'
import { useAuthStore } from './auth'

interface ChatState {
  users: Contact[]
  activeContact: Contact | null
  conversations: Record<string, DirectMessage[]> // keyed by the other user's id
  loadingUsers: boolean
  wired: boolean

  init: () => Promise<void>
  loadUsers: () => Promise<void>
  openChat: (contact: Contact) => Promise<void>
  closeChat: () => void
  sendMessage: (recipientId: string, content: string) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  users: [],
  activeContact: null,
  conversations: {},
  loadingUsers: false,
  wired: false,

  // Called once the user is authenticated: connect the socket, attach the
  // DM + presence listeners, and load the people you can message.
  init: async () => {
    const token = useAuthStore.getState().token
    if (!token) return

    if (!get().wired) {
      set({ wired: true })
      const socket = connectSocket(token)

      socket.on('dm:message', (message: DirectMessage) => {
        const myId = useAuthStore.getState().user?.id
        const otherId = message.senderId === myId ? message.recipientId : message.senderId
        set(state => ({
          conversations: {
            ...state.conversations,
            [otherId]: [...(state.conversations[otherId] ?? []), message]
          }
        }))
      })

      socket.on('presence:update', (userId: string, presence: UserPresence) => {
        const status = presenceToStatus(presence)
        set(state => ({
          users: state.users.map(u => (u.id === userId ? { ...u, status } : u)),
          activeContact:
            state.activeContact?.id === userId
              ? { ...state.activeContact, status }
              : state.activeContact
        }))
      })
    }

    await get().loadUsers()
  },

  loadUsers: async () => {
    set({ loadingUsers: true })
    try {
      const { data } = await api.get<UserWithPresence[]>('/users')
      set({ users: data.map(toContact), loadingUsers: false })
    } catch {
      set({ loadingUsers: false })
    }
  },

  openChat: async (contact) => {
    set({ activeContact: contact })
    try {
      const { data } = await api.get<DirectMessage[]>(`/dm/${contact.id}`)
      set(state => ({ conversations: { ...state.conversations, [contact.id]: data } }))
    } catch {
      /* leave whatever we already have for this contact */
    }
  },

  closeChat: () => set({ activeContact: null }),

  // Fire-and-forget: the message echoes back over `dm:message` (to both ends),
  // which is what actually appends it to the conversation.
  sendMessage: (recipientId, content) => {
    const text = content.trim()
    if (!text) return
    getSocket().emit('dm:send', { recipientId, content: text })
  }
}))
