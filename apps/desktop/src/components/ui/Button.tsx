import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { Spinner } from './Spinner'

export type ButtonVariant = 'default' | 'ghost' | 'outline' | 'destructive' | 'link'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon-xs' | 'icon-sm' | 'icon-md' | 'icon-lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

const variants: Record<ButtonVariant, string> = {
  default:     'bg-text-primary text-bg-base hover:bg-text-secondary active:scale-[0.98]',
  ghost:       'text-text-secondary hover:bg-bg-subtle hover:text-text-primary active:scale-[0.98]',
  outline:     'border border-border text-text-primary hover:bg-bg-subtle active:scale-[0.98]',
  destructive: 'bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 active:scale-[0.98]',
  link:        'text-text-secondary hover:text-text-primary underline-offset-4 hover:underline p-0 h-auto'
}

const sizes: Record<ButtonSize, string> = {
  xs:       'h-6 px-2 text-xs rounded',
  sm:       'h-7 px-2.5 text-xs rounded-md',
  md:       'h-8 px-3 text-sm rounded-md',
  lg:       'h-9 px-4 text-base rounded-lg',
  'icon-xs': 'h-6 w-6 rounded',
  'icon-sm': 'h-7 w-7 rounded-md',
  'icon-md': 'h-8 w-8 rounded-md',
  'icon-lg': 'h-9 w-9 rounded-lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', loading, leftIcon, rightIcon, fullWidth, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-medium',
        'transition-all duration-100 select-none cursor-pointer',
        'disabled:opacity-40 disabled:pointer-events-none',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
)
Button.displayName = 'Button'
