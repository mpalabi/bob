import { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export type CardVariant = 'default' | 'raised' | 'bordered' | 'ghost'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: 'none' | 'sm' | 'md' | 'lg'
  header?: ReactNode
  footer?: ReactNode
  hoverable?: boolean
}

const variants: Record<CardVariant, string> = {
  default:  'bg-bg-raised border border-border',
  raised:   'bg-bg-overlay border border-border shadow-sm',
  bordered: 'bg-transparent border border-border',
  ghost:    'bg-transparent'
}

const paddings = {
  none: '',
  sm:   'p-2',
  md:   'p-3',
  lg:   'p-4'
}

export function Card({ className, variant = 'default', padding = 'md', header, footer, hoverable, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden',
        variants[variant],
        hoverable && 'transition-colors duration-100 cursor-pointer hover:bg-bg-subtle',
        className
      )}
      {...props}
    >
      {header && (
        <div className="px-3 py-2 border-b border-border text-xs font-medium text-text-secondary">
          {header}
        </div>
      )}
      <div className={paddings[padding]}>
        {children}
      </div>
      {footer && (
        <div className="px-3 py-2 border-t border-border">
          {footer}
        </div>
      )}
    </div>
  )
}
