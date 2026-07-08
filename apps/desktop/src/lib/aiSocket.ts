import { io, Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@bob/shared'
import { API_URL } from './config'

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

// Returns a connected (or connecting) socket for the /ai namespace.
// Creates a fresh socket if none exists or the previous one failed/closed.
export function getAiSocket() {
  if (socket && (socket.connected || socket.active)) return socket

  // Previous socket is dead — discard it and reconnect with the latest token.
  socket?.removeAllListeners()
  socket?.disconnect()

  socket = io(`${API_URL}/ai`, {
    withCredentials: true,
    auth: { token: localStorage.getItem('bob_token') },
    reconnection: false, // we manage reconnection ourselves on next send
  })

  return socket
}

export function resetAiSocket() {
  socket?.removeAllListeners()
  socket?.disconnect()
  socket = null
}
