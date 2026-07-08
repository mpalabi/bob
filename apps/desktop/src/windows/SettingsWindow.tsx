import { useEffect, useMemo, useState } from 'react'
import { Sparkles, SlidersHorizontal, Check, User, LogOut, LogIn } from 'lucide-react'
import { AI_PROVIDERS, type AiProvider } from '@bob/shared'
import { cn } from '../lib/utils'
import { Button, Input, Select, Spinner } from '../components/ui'
import { useAiSettingsStore } from '../store/aiSettings'
import { useAuthStore } from '../store/auth'

type SettingsSection = 'ai' | 'general' | 'profile'

const sections: { key: SettingsSection; label: string; Icon: typeof Sparkles }[] = [
  { key: 'ai', label: 'AI Models', Icon: Sparkles },
  { key: 'general', label: 'General', Icon: SlidersHorizontal },
  { key: 'profile', label: 'Profile', Icon: User }
]

export function SettingsWindow() {
  const [active, setActive] = useState<SettingsSection>('ai')
  const restore = useAuthStore(s => s.restore)

  // Receive the token injected by the main process and restore the session.
  useEffect(() => {
    window.electron?.onAuthToken((token) => {
      if (token) {
        try { localStorage.setItem('bob_token', token) } catch { /* ignore */ }
      }
      restore()
    })
    // Also restore from whatever is already in localStorage.
    restore()
    return () => window.electron?.removeAllListeners('auth:token')
  }, [restore])

  return (
    <div className="w-full h-screen flex flex-col bg-bg-base overflow-hidden">
      {/* Title bar */}
      <div
        className="h-10 px-4 flex items-center flex-shrink-0 bg-bg-raised border-b border-border"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="text-sm font-semibold text-text-primary">Settings</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0 border-r border-border p-2 flex flex-col gap-0.5">
          {sections.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={cn(
                'w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-md text-sm font-medium transition-colors',
                active === key
                  ? 'bg-bg-subtle text-text-primary'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-subtle'
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {active === 'ai' && <AiModelsSection />}
          {active === 'general' && <GeneralSection />}
          {active === 'profile' && <ProfileSection />}
        </div>
      </div>
    </div>
  )
}

function AiModelsSection() {
  const { settings, loading, saving, saved, error, load, save } = useAiSettingsStore()

  const [provider, setProvider] = useState<AiProvider>('deepseek')
  const [model, setModel] = useState('deepseek-chat')
  const [apiKey, setApiKey] = useState('')

  useEffect(() => { load() }, [load])

  // Seed the form once settings arrive.
  useEffect(() => {
    if (settings) {
      setProvider(settings.provider)
      setModel(settings.model)
    }
  }, [settings])

  const info = useMemo(() => AI_PROVIDERS.find(p => p.id === provider)!, [provider])

  const onProviderChange = (next: AiProvider) => {
    setProvider(next)
    setModel(AI_PROVIDERS.find(p => p.id === next)!.defaultModel)
  }

  const keySavedForCurrent = settings?.provider === provider && settings?.hasApiKey
  const canSave = !!model.trim() && (keySavedForCurrent || apiKey.trim().length > 0)

  const onSave = async () => {
    await save({ provider, model: model.trim(), apiKey: apiKey.trim() || undefined })
    setApiKey('')
  }

  return (
    <div className="p-6 max-w-xl">
      <h2 className="text-base font-semibold text-text-primary">AI Models</h2>
      <p className="text-sm text-text-secondary mt-1">
        Choose which model powers the assistant and use your own API key.
      </p>

      {loading && !settings ? (
        <div className="flex items-center gap-2 mt-6 text-text-tertiary text-sm">
          <Spinner size="sm" /> Loading…
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          <Select
            label="Provider"
            value={provider}
            onChange={(e) => onProviderChange(e.target.value as AiProvider)}
            options={AI_PROVIDERS.map(p => ({ value: p.id, label: p.label }))}
          />

          <div className="flex flex-col gap-1">
            <Input
              label="Model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              list="ai-model-suggestions"
              placeholder={info.defaultModel}
            />
            <datalist id="ai-model-suggestions">
              {info.models.map(m => <option key={m} value={m} />)}
            </datalist>
          </div>

          <Input
            label="API key"
            type="password"
            showToggle
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={keySavedForCurrent ? '•••••••••• (saved — leave blank to keep)' : 'Paste your API key'}
            hint={info.keyHint}
            autoComplete="off"
          />

          <div className="flex items-center gap-3 pt-1">
            <Button onClick={onSave} loading={saving} disabled={!canSave}>
              Save
            </Button>
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm text-success">
                <Check size={14} /> Saved
              </span>
            )}
            {error && <span className="text-sm text-destructive">{error}</span>}
          </div>

          <p className="text-xs text-text-tertiary border-t border-border pt-4">
            Your key is sent to the Bob server and used only to call {info.label}. Leave the key
            blank to fall back to a server-configured key (if one is set).
          </p>
        </div>
      )}
    </div>
  )
}

function ProfileSection() {
  const { user, status, logout } = useAuthStore()

  const isAuthenticated = status === 'authenticated'
  const isLoading = status === 'loading' || status === 'idle'

  const handleLogout = () => {
    logout()
  }

  const handleLogin = () => {
    window.electron?.openAuth()
  }

  return (
    <div className="p-6 max-w-xl">
      <h2 className="text-base font-semibold text-text-primary">Profile</h2>
      <p className="text-sm text-text-secondary mt-1">
        Your account and session.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 mt-6 text-text-tertiary text-sm">
          <Spinner size="sm" /> Loading…
        </div>
      ) : isAuthenticated && user ? (
        <div className="mt-6 flex flex-col gap-6">
          {/* Avatar + info */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-bg-subtle border border-border flex items-center justify-center text-xl font-semibold text-text-secondary select-none">
              {user.name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-text-primary">{user.name}</span>
              <span className="text-xs text-text-tertiary">{user.email}</span>
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="flex items-center gap-2 text-destructive hover:text-destructive"
            >
              <LogOut size={15} />
              Sign out
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          <p className="text-sm text-text-tertiary">You are not signed in.</p>
          <Button onClick={handleLogin} className="flex items-center gap-2 w-fit">
            <LogIn size={15} />
            Sign in
          </Button>
        </div>
      )}
    </div>
  )
}

function GeneralSection() {
  return (
    <div className="p-6 max-w-xl">
      <h2 className="text-base font-semibold text-text-primary">General</h2>
      <p className="text-sm text-text-secondary mt-1">More settings coming soon.</p>
    </div>
  )
}
