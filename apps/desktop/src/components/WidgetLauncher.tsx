import { cn } from '../lib/utils'

interface WidgetLauncherProps {
  open: boolean
  onClick: () => void
}

export function WidgetLauncher({ open, onClick }: WidgetLauncherProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-13 h-13 rounded-full flex items-center justify-center flex-shrink-0',
        'bg-text-primary shadow-lg',
        'transition-all duration-200 ease-out',
        'hover:scale-110 active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong'
      )}
      style={{ width: 52, height: 52 }}
      aria-label={open ? 'Close Bob' : 'Open Bob'}
    >
      <div className={cn(
        'transition-all duration-200',
        open ? 'rotate-45 scale-90' : 'rotate-0 scale-100'
      )}>
        {open ? (
          // Close icon
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="text-bg-base">
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          </svg>
        ) : (
          // Bob logo / chat icon
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-bg-base">
            <path
              d="M11 2C6.03 2 2 5.8 2 10.5c0 2.1.8 4 2.1 5.5L3 19l3.3-1.1A9.3 9.3 0 0011 19c4.97 0 9-3.8 9-8.5S15.97 2 11 2z"
              fill="currentColor"
            />
          </svg>
        )}
      </div>
    </button>
  )
}
