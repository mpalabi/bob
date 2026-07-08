import { forwardRef, InputHTMLAttributes, ReactNode, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  hint?: string
  error?: string
  prefix?: ReactNode
  suffix?: ReactNode
  onClear?: () => void
  containerClassName?: string
  /** Adds show/hide toggle for password inputs */
  showToggle?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, containerClassName, label, hint, error, prefix, suffix, onClear, showToggle, value, id, type, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    const [visible, setVisible] = useState(false)

    const isPassword = type === 'password'
    const resolvedType = isPassword && showToggle && visible ? 'text' : type

    return (
      <div className={cn('flex flex-col gap-1', containerClassName)}>
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className={cn(
          'flex items-center h-8 rounded-md border transition-colors duration-100',
          'bg-bg-input',
          error ? 'border-destructive' : 'border-border focus-within:border-border-strong'
        )}>
          {prefix && (
            <span className="pl-2.5 text-text-tertiary flex-shrink-0">{prefix}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            value={value}
            type={resolvedType}
            className={cn(
              'flex-1 h-full px-2.5 text-sm bg-transparent',
              'text-text-primary placeholder:text-text-tertiary',
              'outline-none',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              !!prefix && 'pl-1.5',
              !!(suffix || onClear || (isPassword && showToggle)) && 'pr-1.5',
              className
            )}
            {...props}
          />
          {onClear && value && (
            <button
              type="button"
              onClick={onClear}
              className="pr-2 text-text-tertiary hover:text-text-secondary transition-colors"
              tabIndex={-1}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 5.293L10.146 1.146a.5.5 0 01.708.708L6.707 6l4.147 4.146a.5.5 0 01-.708.708L6 6.707 1.854 10.854a.5.5 0 01-.708-.708L5.293 6 1.146 1.854a.5.5 0 01.708-.708z"/>
              </svg>
            </button>
          )}
          {isPassword && showToggle && (
            <button
              type="button"
              onClick={() => setVisible(v => !v)}
              className="pr-2.5 text-text-tertiary hover:text-text-secondary transition-colors flex-shrink-0"
              tabIndex={-1}
              aria-label={visible ? 'Hide password' : 'Show password'}
            >
              {visible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
          {suffix && (
            <span className="pr-2.5 text-text-tertiary flex-shrink-0">{suffix}</span>
          )}
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
Input.displayName = 'Input'
