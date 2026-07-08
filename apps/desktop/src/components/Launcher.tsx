import { useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { BobMascot } from './BobMascot'
import { Button } from './ui'
import { cn } from '../lib/utils'

interface LauncherProps {
  /** Width of the expanded search input, in px. */
  expandedWidth: number
  searching: boolean
  query: string
  panelOpen: boolean
  onQueryChange: (q: string) => void
  onToggle: () => void
  onCloseSearch: () => void
}

const BOB_SIZE = 64

export function Launcher({
  expandedWidth,
  searching,
  query,
  panelOpen,
  onQueryChange,
  onToggle,
  onCloseSearch
}: LauncherProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searching) {
      // focus once the morph has started
      const id = setTimeout(() => inputRef.current?.focus(), 120)
      return () => clearTimeout(id)
    }
  }, [searching])

  return (
    <div
      className="relative flex items-center justify-end"
      style={{
        width: searching ? expandedWidth : BOB_SIZE,
        height: searching ? 44 : BOB_SIZE,
        transition: 'width 0.34s cubic-bezier(0.22,1,0.36,1), height 0.34s cubic-bezier(0.22,1,0.36,1)'
      }}
    >
      {/* Search input layer */}
      <div
        className={cn(
          'absolute inset-0 flex items-center gap-2 px-3.5 rounded-full bg-bg-raised border border-border shadow-lg',
          'transition-opacity duration-200',
          searching ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        <Search size={16} className="text-text-tertiary flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onCloseSearch() }}
          placeholder="Search people"
          className="flex-1 min-w-0 bg-transparent outline-none text-base text-text-primary placeholder:text-text-tertiary"
        />
        <Button
          aria-label="Close search"
          variant="ghost"
          size="icon-sm"
          onClick={onCloseSearch}
          className="flex-shrink-0 rounded-full text-text-tertiary"
        >
          <X size={15} />
        </Button>
      </div>

      {/* Bob layer */}
      <div
        className={cn(
          'absolute right-0 bottom-0 transition-opacity duration-200',
          searching ? 'opacity-0 pointer-events-none' : 'opacity-100'
        )}
      >
        <BobMascot open={panelOpen} onClick={onToggle} size={BOB_SIZE} trackingRadius={320} />
      </div>
    </div>
  )
}
