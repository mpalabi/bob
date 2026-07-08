import { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  description?: string
}

export function Toggle({ label, description, className, id, ...props }: ToggleProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <label htmlFor={inputId} className={cn('flex items-start justify-between gap-3 cursor-pointer', props.disabled && 'opacity-40 pointer-events-none', className)}>
      {(label || description) && (
        <div className="flex flex-col gap-0.5">
          {label && <span className="text-sm text-text-primary">{label}</span>}
          {description && <span className="text-xs text-text-secondary">{description}</span>}
        </div>
      )}
      <div className="relative flex-shrink-0">
        <input id={inputId} type="checkbox" className="sr-only peer" {...props} />
        <div className={cn(
          'w-8 h-4.5 rounded-full border border-border transition-colors duration-150',
          'bg-bg-input peer-checked:bg-text-primary peer-checked:border-text-primary',
          'peer-focus-visible:ring-1 peer-focus-visible:ring-border-strong'
        )} style={{ height: '18px' }} />
        <div className={cn(
          'absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-text-tertiary transition-all duration-150',
          'peer-checked:translate-x-3.5 peer-checked:bg-bg-base'
        )} />
      </div>
    </label>
  )
}
