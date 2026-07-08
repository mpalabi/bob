import { cn } from '../../lib/utils'

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function Separator({ orientation = 'horizontal', className }: SeparatorProps) {
  return (
    <div
      className={cn(
        'bg-border flex-shrink-0',
        orientation === 'horizontal' ? 'w-full h-px' : 'h-full w-px',
        className
      )}
    />
  )
}
