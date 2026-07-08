import { forwardRef, SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
  containerClassName?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, containerClassName, label, hint, error, options, placeholder, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className={cn('flex flex-col gap-1', containerClassName)}>
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-8 pl-3 pr-8 rounded-md text-sm appearance-none',
              'bg-bg-input text-text-primary border transition-colors duration-100',
              error ? 'border-destructive' : 'border-border focus:border-border-strong',
              'outline-none cursor-pointer',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              className
            )}
            {...props}
          >
            {placeholder && <option value="" disabled>{placeholder}</option>}
            {options.map(opt => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
            ))}
          </select>
          <svg
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-tertiary pointer-events-none"
            viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
          >
            <path d="M3 5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {(hint || error) && (
          <p className={cn('text-xs', error ? 'text-destructive' : 'text-text-tertiary')}>
            {error ?? hint}
          </p>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'
