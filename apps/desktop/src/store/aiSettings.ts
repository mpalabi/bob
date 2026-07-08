import { create } from 'zustand'
import type { AiSettings, AiSettingsInput } from '@bob/shared'
import { api } from '../lib/api'

interface AiSettingsState {
  settings: AiSettings | null
  loading: boolean
  saving: boolean
  error: string | null
  saved: boolean

  load: () => Promise<void>
  save: (input: AiSettingsInput) => Promise<void>
}

export const useAiSettingsStore = create<AiSettingsState>((set) => ({
  settings: null,
  loading: false,
  saving: false,
  error: null,
  saved: false,

  load: async () => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get<AiSettings>('/ai/settings')
      set({ settings: data, loading: false })
    } catch {
      set({ loading: false, error: 'Could not load AI settings.' })
    }
  },

  save: async (input) => {
    set({ saving: true, error: null, saved: false })
    try {
      const { data } = await api.put<AiSettings>('/ai/settings', input)
      set({ settings: data, saving: false, saved: true })
      setTimeout(() => set({ saved: false }), 2500)
    } catch {
      set({ saving: false, error: 'Could not save. Check that you are signed in.' })
    }
  }
}))
