import { ReactNode, useEffect } from 'react'
import { cn } from '../../lib/utils'
import { Button } from './Button'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  closeOnBackdrop?: boolean
}

const sizes = {
  sm: 'w-72',
  md: 'w-96',
  lg: 'w-[480px]'
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md', closeOnBackdrop = true }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Panel */}
      <div className={cn(
        'relative z-10 bg-bg-raised border border-border rounded-xl shadow-lg flex flex-col max-h-[calc(100%-48px)] overflow-hidden',
        sizes[size]
      )}>
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
            <div>
              {title && <h2 className="text-sm font-semibold text-text-primary">{title}</h2>}
              {description && <p className="text-xs text-text-secondary mt-0.5">{description}</p>}
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} className="flex-shrink-0 -mr-1 -mt-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 5.293L10.146 1.146a.5.5 0 01.708.708L6.707 6l4.147 4.146a.5.5 0 01-.708.708L6 6.707 1.854 10.854a.5.5 0 01-.708-.708L5.293 6 1.146 1.854a.5.5 0 01.708-.708z"/>
              </svg>
            </Button>
          </div>
        )}

        {/* Body */}
        {children && (
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {children}
          </div>
        )}

        {/* Footer */}
        {footer && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-end gap-2 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
