import { ReactNode, useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'

export interface PopoverProps {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right' | 'center'
  side?: 'top' | 'bottom'
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function Popover({ trigger, children, align = 'left', side = 'bottom', className, open: controlledOpen, onOpenChange }: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = (v: boolean) => { setInternalOpen(v); onOpenChange?.(v) }
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const alignClass = { left: 'left-0', right: 'right-0', center: 'left-1/2 -translate-x-1/2' }

  return (
    <div ref={ref} className="relative inline-flex">
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div className={cn(
          'absolute z-50 bg-bg-overlay border border-border rounded-lg shadow-md',
          side === 'bottom' ? 'top-full mt-1.5' : 'bottom-full mb-1.5',
          alignClass[align],
          className
        )}>
          {children}
        </div>
      )}
    </div>
  )
}
