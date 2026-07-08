import type { UserPresence, UserWithPresence } from '@bob/shared'

export interface Contact {
  id: string
  name: string
  avatarUrl?: string | null
  status?: 'online' | 'away' | 'busy'
}

// Gradient palette — initials avatars pick a stable pair from this set.
export const GRADIENTS: [string, string][] = [
  ['#5b9dff', '#3b82f6'], // blue
  ['#c084fc', '#a855f7'], // purple
  ['#ff8f8f', '#f0564f'], // coral
  ['#34d399', '#10b981'], // green
  ['#fbbf24', '#f59e0b'], // amber
  ['#f472b6', '#ec4899'], // pink
  ['#22d3ee', '#06b6d4'], // cyan
  ['#a3e635', '#84cc16']  // lime
]

export const presenceColors: Record<NonNullable<Contact['status']>, string> = {
  online: 'bg-success',
  away: 'bg-warning',
  busy: 'bg-destructive'
}

// Offline shows no status dot; everything else maps straight through.
export function presenceToStatus(presence: UserPresence): Contact['status'] {
  return presence === 'offline' ? undefined : presence
}

export function toContact(user: UserWithPresence): Contact {
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
    status: presenceToStatus(user.presence)
  }
}

function hashCode(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h)
}

export function gradientFor(name: string): [string, string] {
  return GRADIENTS[hashCode(name) % GRADIENTS.length]
}

export function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}
