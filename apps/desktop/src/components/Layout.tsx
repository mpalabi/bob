import { Outlet, NavLink } from 'react-router-dom'
import { Separator } from './ui'
import { cn } from '../lib/utils'

const navItems = [
  { to: '/', label: 'Chat', end: true },
  { to: '/ai', label: 'AI' },
  { to: '/tasks', label: 'Tasks' }
]

export function Layout() {
  return (
    <div className="flex flex-col w-full h-full bg-bg-base rounded-xl overflow-hidden shadow-lg border border-border">
      {/* Title bar — drag region */}
      <div
        className="flex items-center px-4 h-11 bg-bg-raised flex-shrink-0 select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="text-sm font-semibold text-text-primary tracking-tight">Bob</span>
      </div>

      <Separator />

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>

      <Separator />

      {/* Bottom nav */}
      <nav
        className="flex items-center gap-1 px-3 h-11 bg-bg-raised flex-shrink-0"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {navItems.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-100',
              isActive
                ? 'bg-bg-subtle text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-subtle'
            )}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
