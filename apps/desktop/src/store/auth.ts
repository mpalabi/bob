import { create } from 'zustand'
import { AxiosError } from 'axios'
import type { AuthResponse, UserWithPresence } from '@bob/shared'
import { api } from '../lib/api'
import { makeLogger } from '../lib/logger'

const log = makeLogger('auth')
const TOKEN_KEY = 'bob_token'

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

interface AuthState {
  user: UserWithPresence | null
  token: string | null
  status: AuthStatus
  error: string | null

  login: (email: string, password: string) => Promise<void>
  register: (email: string, name: string, password: string) => Promise<void>
  restore: () => Promise<void>
  logout: () => void
  clearError: () => void
}

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function persistToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    log.warn('localStorage unavailable — token not persisted')
  }
  window.electron?.authSuccess(token)
}

function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

function messageFromError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string | string[] } | undefined
    const msg = data?.message
    if (Array.isArray(msg)) return msg[0]
    if (typeof msg === 'string') return msg
  }
  return fallback
}

export const useAuthStore = create<AuthState>((set) => {
  async function authenticate(
    path: '/auth/login' | '/auth/register',
    body: Record<string, string>,
    fallbackError: string
  ) {
    log.event(`${path} attempt`, { email: body.email })
    set({ status: 'loading', error: null })
    try {
      const { data } = await api.post<AuthResponse>(path, body)
      log.info(`${path} success — user:`, data.user.email)
      persistToken(data.accessToken)
      set({ user: data.user, token: data.accessToken, status: 'authenticated', error: null })
    } catch (err) {
      const msg = messageFromError(err, fallbackError)
      log.error(`${path} failed:`, msg)
      if (err instanceof AxiosError) {
        log.error('  code:', err.code, 'message:', err.message)
        log.error('  status:', err.response?.status, 'body:', err.response?.data)
        log.error('  url:', err.config?.baseURL, err.config?.url)
      }
      set({ status: 'unauthenticated', error: msg })
      throw err
    }
  }

  return {
    user: null,
    token: readToken(),
    status: 'idle',
    error: null,

    login: (email, password) =>
      authenticate('/auth/login', { email, password }, 'Unable to sign in'),

    register: (email, name, password) =>
      authenticate('/auth/register', { email, name, password }, 'Unable to create account'),

    restore: async () => {
      const token = readToken()
      log.event('restore — token present:', !!token)
      if (!token) {
        set({ status: 'unauthenticated', user: null, token: null })
        return
      }
      set({ status: 'loading', token })
      try {
        const { data } = await api.get<UserWithPresence>('/auth/me')
        log.info('restore success — user:', data.email)
        set({ user: data, token, status: 'authenticated', error: null })
      } catch (err) {
        log.warn('restore failed — clearing token')
        if (err instanceof AxiosError) {
          log.warn('  status:', err.response?.status, 'body:', err.response?.data)
        }
        clearToken()
        set({ user: null, token: null, status: 'unauthenticated' })
      }
    },

    logout: () => {
      log.event('logout')
      clearToken()
      window.electron?.logout()
      set({ user: null, token: null, status: 'unauthenticated', error: null })
    },

    clearError: () => set({ error: null })
  }
})
