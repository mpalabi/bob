import { ReactNode, useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'

export interface MenuItem {
  key: string
  label: ReactNode
  icon?: ReactNode
  shortcut?: string
  destructive?: boolean
  disabled?: boolean
  separator?: never
}

export interface MenuSeparator {
  key: string
  separator: true
  label?: never
}

export type MenuEntry = MenuItem | MenuSeparator

export interface MenuProps {
  items: MenuEntry[]
  onSelect: (key: string) => void
  trigger: ReactNode
  align?: 'left' | 'right'
  side?: 'top' | 'bottom'
}

export function Menu({ items, onSelect, trigger, align = 'left', side = 'bottom' }: MenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex">
      <div onClick={() => setOpen(v => !v)}>{trigger}</div>

      {open && (
        <div className={cn(
          'absolute z-50 min-w-[160px] bg-bg-overlay border border-border rounded-lg shadow-md py-1',
          side === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1',
          align === 'right' ? 'right-0' : 'left-0'
        )}>
          {items.map(item => {
            if ('separator' in item && item.separator) {
              return <div key={item.key} className="my-1 h-px bg-border mx-1" />
            }
            const entry = item as MenuItem
            return (
              <button
                key={entry.key}
                disabled={entry.disabled}
                onClick={() => { onSelect(entry.key); setOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left',
                  'transition-colors duration-75 disabled:opacity-40 disabled:pointer-events-none',
                  entry.destructive
                    ? 'text-destructive hover:bg-destructive/10'
                    : 'text-text-primary hover:bg-bg-subtle'
                )}
              >
                {entry.icon && (
                  <span className={cn('flex-shrink-0', entry.destructive ? 'text-destructive' : 'text-text-secondary')}>
                    {entry.icon}
                  </span>
                )}
                <span className="flex-1">{entry.label}</span>
                {entry.shortcut && (
                  <span className="text-text-tertiary ml-4">{entry.shortcut}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
