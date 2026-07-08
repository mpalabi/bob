import { cn } from '../lib/utils'
import { gradientFor, initials, presenceColors, type Contact } from '../lib/contacts'

interface ContactAvatarProps {
  contact: Contact
  /** Fixed diameter in px. When omitted the avatar fills its container (grid cell). */
  px?: number
  className?: string
}

export function ContactAvatar({ contact, px, className }: ContactAvatarProps) {
  const [from, to] = gradientFor(contact.name)
  return (
    <div
      className={cn(
        'relative rounded-full flex items-center justify-center font-semibold text-white/95 ring-1 ring-white/10 overflow-hidden',
        px ? '' : 'aspect-square w-full text-base',
        className
      )}
      style={{
        background: `radial-gradient(circle at 35% 30%, ${from}, ${to})`,
        ...(px ? { width: px, height: px, fontSize: Math.round(px * 0.36) } : {})
      }}
    >
      {contact.avatarUrl ? (
        <img src={contact.avatarUrl} alt={contact.name} className="w-full h-full object-cover" />
      ) : (
        initials(contact.name)
      )}
      {contact.status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-bg-base',
            presenceColors[contact.status]
          )}
        />
      )}
    </div>
  )
}
