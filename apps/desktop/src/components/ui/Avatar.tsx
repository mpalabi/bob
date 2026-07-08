import { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'

export interface AvatarProps {
  src?: string | null
  name?: string
  size?: AvatarSize
  presence?: PresenceStatus
  fallback?: ReactNode
  className?: string
}

const sizes: Record<AvatarSize, string> = {
  xs: 'w-5 h-5 text-2xs',
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-md',
  xl: 'w-12 h-12 text-lg'
}

const dotSizes: Record<AvatarSize, string> = {
  xs: 'w-1.5 h-1.5 -bottom-px -right-px',
  sm: 'w-2 h-2 -bottom-px -right-px',
  md: 'w-2.5 h-2.5 bottom-0 right-0',
  lg: 'w-3 h-3 bottom-0 right-0',
  xl: 'w-3.5 h-3.5 bottom-0 right-0'
}

const presenceColors: Record<PresenceStatus, string> = {
  online: 'bg-success',
  away:   'bg-warning',
  busy:   'bg-destructive',
  offline:'bg-text-tertiary'
}

function initials(name?: string) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export function Avatar({ src, name, size = 'md', presence, fallback, className }: AvatarProps) {
  return (
    <div className={cn('relative inline-flex flex-shrink-0', sizes[size], className)}>
      <div className="w-full h-full rounded-full overflow-hidden">
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : fallback ? (
          <div className="w-full h-full bg-bg-overlay flex items-center justify-center">{fallback}</div>
        ) : (
          <div className="w-full h-full bg-bg-overlay flex items-center justify-center text-text-secondary font-medium">
            {initials(name)}
          </div>
        )}
      </div>
      {presence && (
        <span className={cn(
          'absolute rounded-full ring-1 ring-bg-base',
          dotSizes[size],
          presenceColors[presence]
        )} />
      )}
    </div>
  )
}

// Stacked group of avatars
export interface AvatarGroupProps {
  users: Array<{ name?: string; src?: string | null }>
  max?: number
  size?: AvatarSize
  className?: string
}

export function AvatarGroup({ users, max = 3, size = 'sm', className }: AvatarGroupProps) {
  const visible = users.slice(0, max)
  const overflow = users.length - max

  return (
    <div className={cn('flex items-center', className)}>
      {visible.map((u, i) => (
        <div key={i} className={cn('ring-1 ring-bg-base rounded-full', i > 0 && '-ml-2')}>
          <Avatar src={u.src} name={u.name} size={size} />
        </div>
      ))}
      {overflow > 0 && (
        <div className={cn(
          'ring-1 ring-bg-base rounded-full -ml-2 bg-bg-overlay flex items-center justify-center text-text-secondary font-medium',
          sizes[size]
        )}>
          <span className="text-2xs">+{overflow}</span>
        </div>
      )}
    </div>
  )
}
