import { useEffect, useRef } from 'react'
import { Users } from 'lucide-react'
import { ContactAvatar } from './ContactAvatar'
import { ScrollArea, ListItem, EmptyState } from './ui'
import { staggerIn } from '../lib/animations'
import type { Contact } from '../lib/contacts'

interface SearchResultsProps {
  results: Contact[]
  onSelect?: (contact: Contact) => void
}

export function SearchResults({ results, onSelect }: SearchResultsProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // Re-stagger the rows in whenever the result set changes.
  useEffect(() => {
    if (listRef.current?.children.length) {
      staggerIn(Array.from(listRef.current.children), { y: 8, delayStep: 22 })
    }
  }, [results])

  return (
    <div className="w-full max-h-[240px] flex flex-col bg-bg-base rounded-2xl overflow-hidden shadow-lg border border-border">
      {results.length === 0 ? (
        <EmptyState
          className="py-6"
          icon={<Users size={20} />}
          title="No people found"
        />
      ) : (
        <ScrollArea className="p-1.5">
          <div ref={listRef}>
            {results.map(c => (
              <ListItem
                key={c.id}
                compact
                onClick={() => onSelect?.(c)}
                avatar={<ContactAvatar contact={c} px={30} />}
                title={c.name}
                style={{ opacity: 0 }}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
