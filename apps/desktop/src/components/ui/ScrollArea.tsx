import { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  direction?: 'vertical' | 'horizontal' | 'both'
}

export function ScrollArea({ className, direction = 'vertical', children, ...props }: ScrollAreaProps) {
  return (
    <div
      className={cn(
        'overflow-hidden relative',
        direction === 'vertical' && 'overflow-y-auto',
        direction === 'horizontal' && 'overflow-x-auto',
        direction === 'both' && 'overflow-auto',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
