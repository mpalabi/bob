import { FormEvent, useState } from 'react'
import { Button, Input } from '../components/ui'
import { useAuthStore } from '../store/auth'
import { makeLogger } from '../lib/logger'

const log = makeLogger('auth-window')

type AuthView = 'login' | 'register'

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.63z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 009 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 013.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 00.96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  )
}

export function AuthWindow() {
  const [view, setView] = useState<AuthView>('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')

  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const clearError = useAuthStore((s) => s.clearError)
  const status = useAuthStore((s) => s.status)
  const error = useAuthStore((s) => s.error)

  const loading = status === 'loading'
  const isRegister = view === 'register'

  function switchView(next: AuthView) {
    clearError()
    setView(next)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    log.event('form submit —', isRegister ? 'register' : 'login', email.trim())
    try {
      if (isRegister) {
        await register(email.trim(), name.trim(), password)
      } else {
        await login(email.trim(), password)
      }
      log.info('auth success — waiting for main to close window')
    } catch {
      // Error is surfaced through the store; nothing else to do here.
    }
  }

  const canSubmit =
    email.trim().length > 0 &&
    password.length >= 8 &&
    (!isRegister || name.trim().length > 0)

  return (
    <div className="w-full h-screen flex flex-col bg-bg-base overflow-hidden">
      {/* Custom title bar */}
      <div
        className="h-10 flex-shrink-0 bg-bg-base"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-10 pb-10">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-text-primary flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 22 22" fill="none" className="text-bg-base">
              <path
                d="M11 2C6.03 2 2 5.8 2 10.5c0 2.1.8 4 2.1 5.5L3 19l3.3-1.1A9.3 9.3 0 0011 19c4.97 0 9-3.8 9-8.5S15.97 2 11 2z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-text-primary">Bob</h1>
          <p className="text-xs text-text-tertiary text-center">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          {isRegister && (
            <Input
              label="Name"
              type="text"
              autoComplete="name"
              placeholder="Ada Lovelace"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          )}

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          <Input
            label="Password"
            type="password"
            showToggle
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            hint={isRegister ? 'Use at least 8 characters' : undefined}
            error={error ?? undefined}
          />

          <Button
            type="submit"
            fullWidth
            loading={loading}
            disabled={!canSubmit}
            className="mt-1"
          >
            {isRegister ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        {/* Divider */}
        <div className="w-full flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-text-tertiary">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Google OAuth */}
        <Button
          type="button"
          variant="outline"
          fullWidth
          disabled={loading}
          onClick={() => window.electron?.signInWithGoogle()}
          leftIcon={<GoogleIcon />}
        >
          {isRegister ? 'Sign up with Google' : 'Continue with Google'}
        </Button>

        {/* Toggle login / register */}
        <p className="mt-8 text-xs text-text-tertiary">
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <button
            type="button"
            onClick={() => switchView(isRegister ? 'login' : 'register')}
            className="text-text-secondary hover:text-text-primary transition-colors underline underline-offset-2"
          >
            {isRegister ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}
