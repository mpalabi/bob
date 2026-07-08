import { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  description?: string
  indeterminate?: boolean
}

export function Checkbox({ label, description, indeterminate, className, id, ...props }: CheckboxProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <label htmlFor={inputId} className={cn('flex items-start gap-2.5 cursor-pointer group', props.disabled && 'opacity-40 pointer-events-none', className)}>
      <div className="relative flex-shrink-0 mt-0.5">
        <input
          id={inputId}
          type="checkbox"
          className="sr-only peer"
          ref={el => { if (el) el.indeterminate = !!indeterminate }}
          {...props}
        />
        <div className={cn(
          'w-4 h-4 rounded border transition-colors duration-100 flex items-center justify-center',
          'border-border peer-checked:bg-text-primary peer-checked:border-text-primary',
          'peer-indeterminate:bg-text-primary peer-indeterminate:border-text-primary',
          'group-hover:border-border-strong peer-focus-visible:ring-1 peer-focus-visible:ring-border-strong'
        )}>
          {indeterminate ? (
            <svg width="8" height="2" viewBox="0 0 8 2" fill="currentColor" className="text-bg-base">
              <rect width="8" height="2" rx="1"/>
            </svg>
          ) : (
            <svg width="8" height="6" viewBox="0 0 8 6" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-bg-base opacity-0 peer-checked:opacity-100">
              <path d="M1 3l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>
      {(label || description) && (
        <div className="flex flex-col gap-0.5">
          {label && <span className="text-sm text-text-primary">{label}</span>}
          {description && <span className="text-xs text-text-secondary">{description}</span>}
        </div>
      )}
    </label>
  )
}
