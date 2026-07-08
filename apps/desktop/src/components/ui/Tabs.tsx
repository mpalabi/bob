import { ReactNode, createContext, useContext, useState } from 'react'
import { cn } from '../../lib/utils'

type TabsVariant = 'line' | 'pill' | 'boxed'

interface TabsContextValue {
  active: string
  setActive: (key: string) => void
  variant: TabsVariant
}

const TabsCtx = createContext<TabsContextValue | null>(null)
const useTabs = () => {
  const ctx = useContext(TabsCtx)
  if (!ctx) throw new Error('Tab components must be used inside <Tabs>')
  return ctx
}

export interface TabsProps {
  defaultValue: string
  value?: string
  onChange?: (value: string) => void
  variant?: TabsVariant
  children: ReactNode
  className?: string
}

export function Tabs({ defaultValue, value, onChange, variant = 'line', children, className }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue)
  const active = value ?? internal
  const setActive = (key: string) => { setInternal(key); onChange?.(key) }

  return (
    <TabsCtx.Provider value={{ active, setActive, variant }}>
      <div className={cn('flex flex-col', className)}>{children}</div>
    </TabsCtx.Provider>
  )
}

export interface TabListProps {
  children: ReactNode
  className?: string
}

export function TabList({ children, className }: TabListProps) {
  const { variant } = useTabs()
  return (
    <div className={cn(
      'flex items-center gap-0.5',
      variant === 'line' && 'border-b border-border',
      variant === 'boxed' && 'bg-bg-input p-0.5 rounded-lg',
      className
    )}>
      {children}
    </div>
  )
}

export interface TabProps {
  value: string
  children: ReactNode
  className?: string
  disabled?: boolean
}

export function Tab({ value, children, className, disabled }: TabProps) {
  const { active, setActive, variant } = useTabs()
  const isActive = active === value

  return (
    <button
      disabled={disabled}
      onClick={() => setActive(value)}
      className={cn(
        'text-xs font-medium transition-all duration-100 select-none',
        'disabled:opacity-40 disabled:pointer-events-none',
        variant === 'line' && cn(
          'px-3 py-2 -mb-px border-b-2',
          isActive ? 'border-text-primary text-text-primary' : 'border-transparent text-text-tertiary hover:text-text-secondary'
        ),
        variant === 'pill' && cn(
          'px-3 py-1.5 rounded-md',
          isActive ? 'bg-bg-subtle text-text-primary' : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-subtle'
        ),
        variant === 'boxed' && cn(
          'flex-1 px-3 py-1.5 rounded-md',
          isActive ? 'bg-bg-raised text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-secondary'
        ),
        className
      )}
    >
      {children}
    </button>
  )
}

export interface TabPanelProps {
  value: string
  children: ReactNode
  className?: string
}

export function TabPanel({ value, children, className }: TabPanelProps) {
  const { active } = useTabs()
  if (active !== value) return null
  return <div className={cn('flex-1 min-h-0', className)}>{children}</div>
}
