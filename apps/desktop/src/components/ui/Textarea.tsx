import { forwardRef, TextareaHTMLAttributes, useEffect, useRef } from 'react'
import { cn } from '../../lib/utils'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
  autoResize?: boolean
  showCount?: boolean
  containerClassName?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, label, hint, error, autoResize, showCount, maxLength, id, value, onChange, ...props }, ref) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null)
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    useEffect(() => {
      if (!autoResize || !innerRef.current) return
      innerRef.current.style.height = 'auto'
      innerRef.current.style.height = `${innerRef.current.scrollHeight}px`
    }, [value, autoResize])

    const charCount = typeof value === 'string' ? value.length : 0

    return (
      <div className={cn('flex flex-col gap-1', containerClassName)}>
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-text-secondary">
            {label}
          </label>
        )}
        <textarea
          ref={node => {
            innerRef.current = node
            if (typeof ref === 'function') ref(node)
            else if (ref) ref.current = node
          }}
          id={inputId}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          className={cn(
            'w-full px-3 py-2 rounded-md text-sm resize-none',
            'bg-bg-input text-text-primary placeholder:text-text-tertiary',
            'border transition-colors duration-100',
            error ? 'border-destructive' : 'border-border focus:border-border-strong',
            'outline-none',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            autoResize && 'overflow-hidden',
            className
          )}
          {...props}
        />
        <div className="flex justify-between items-center">
          {(hint || error) && (
            <p className={cn('text-xs', error ? 'text-destructive' : 'text-text-tertiary')}>
              {error ?? hint}
            </p>
          )}
          {showCount && maxLength && (
            <p className={cn('text-xs ml-auto', charCount >= maxLength ? 'text-destructive' : 'text-text-tertiary')}>
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
