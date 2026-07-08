import { ElementType, HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export type TextVariant = 'heading' | 'subheading' | 'body' | 'label' | 'caption' | 'code'
export type TextColor = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'success' | 'warning'

export interface TextProps extends HTMLAttributes<HTMLElement> {
  variant?: TextVariant
  color?: TextColor
  as?: ElementType
  truncate?: boolean
  children: ReactNode
}

const variants: Record<TextVariant, string> = {
  heading:    'text-lg font-semibold tracking-tight',
  subheading: 'text-md font-medium',
  body:       'text-sm',
  label:      'text-xs font-medium',
  caption:    'text-xs',
  code:       'text-xs font-mono bg-bg-overlay px-1 py-0.5 rounded'
}

const colors: Record<TextColor, string> = {
  primary:     'text-text-primary',
  secondary:   'text-text-secondary',
  tertiary:    'text-text-tertiary',
  destructive: 'text-destructive',
  success:     'text-success',
  warning:     'text-warning'
}

export function Text({ variant = 'body', color = 'primary', as, truncate, className, children, ...props }: TextProps) {
  const Tag = as ?? (variant === 'heading' ? 'h2' : variant === 'subheading' ? 'h3' : 'p')

  return (
    <Tag
      className={cn(variants[variant], colors[color], truncate && 'truncate', className)}
      {...props}
    >
      {children}
    </Tag>
  )
}
