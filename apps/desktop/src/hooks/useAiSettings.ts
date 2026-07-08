import { useCallback, useEffect, useState } from 'react'
import { AI_PROVIDERS, type AiProvider, type AiSettings } from '@bob/shared'
import { api } from '../lib/api'

export function useAiSettings() {
  const [settings, setSettings] = useState<AiSettings | null>(null)

  useEffect(() => {
    api.get<AiSettings>('/ai/settings')
      .then(r => setSettings(r.data))
      .catch(() => {})
  }, [])

  const updateModel = useCallback(async (provider: AiProvider, model: string) => {
    setSettings(prev => prev ? { ...prev, provider, model } : null)
    try {
      const r = await api.put<AiSettings>('/ai/settings', { provider, model })
      setSettings(r.data)
    } catch {
      // revert on failure — re-fetch
      api.get<AiSettings>('/ai/settings').then(r => setSettings(r.data)).catch(() => {})
    }
  }, [])

  return { settings, allProviders: AI_PROVIDERS, updateModel }
}
