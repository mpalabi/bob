import { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-10 px-6 text-center', className)}>
      {icon && (
        <div className="text-text-tertiary">{icon}</div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-text-secondary">{title}</p>
        {description && <p className="text-xs text-text-tertiary">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
