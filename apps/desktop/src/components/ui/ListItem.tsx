import { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface ListItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  // Left side
  icon?: ReactNode
  avatar?: ReactNode

  // Content
  title: ReactNode
  subtitle?: ReactNode
  meta?: ReactNode        // top-right timestamp / label

  // Right side
  trailing?: ReactNode    // custom right content
  chevron?: boolean

  // States
  active?: boolean
  disabled?: boolean
  destructive?: boolean

  // Layout
  compact?: boolean
}

export function ListItem({
  icon,
  avatar,
  title,
  subtitle,
  meta,
  trailing,
  chevron,
  active,
  disabled,
  destructive,
  compact,
  className,
  ...props
}: ListItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-md transition-colors duration-100 select-none',
        compact ? 'px-2 py-1.5' : 'px-2.5 py-2',
        !disabled && props.onClick && 'cursor-pointer',
        active
          ? 'bg-bg-subtle'
          : !disabled && props.onClick && 'hover:bg-bg-subtle',
        disabled && 'opacity-40 pointer-events-none',
        destructive && 'text-destructive',
        className
      )}
      {...props}
    >
      {/* Left: icon or avatar */}
      {(icon || avatar) && (
        <div className="flex-shrink-0 text-text-secondary">
          {icon ?? avatar}
        </div>
      )}

      {/* Center: title + subtitle */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            'text-sm font-medium truncate',
            destructive ? 'text-destructive' : 'text-text-primary'
          )}>
            {title}
          </span>
          {meta && (
            <span className="text-xs text-text-tertiary flex-shrink-0">{meta}</span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-text-secondary truncate mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Right: trailing content or chevron */}
      {trailing && <div className="flex-shrink-0">{trailing}</div>}
      {chevron && (
        <svg className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}
