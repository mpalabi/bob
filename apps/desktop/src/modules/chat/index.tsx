import { useEffect, useRef } from 'react'
import { Users } from 'lucide-react'
import { ContactAvatar } from '../../components/ContactAvatar'
import { ScrollArea, EmptyState, Spinner } from '../../components/ui'
import { staggerIn } from '../../lib/animations'
import { useChatStore } from '../../store/chat'

export default function ChatModule() {
  const users = useChatStore(s => s.users)
  const loading = useChatStore(s => s.loadingUsers)
  const openChat = useChatStore(s => s.openChat)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (gridRef.current?.children.length) {
      staggerIn(Array.from(gridRef.current.children), { y: 12, delayStep: 18 })
    }
  }, [users])

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="md" />
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <EmptyState
        className="h-full"
        icon={<Users size={22} />}
        title="No one here yet"
        description="Other people who sign in to Bob will show up here to message."
      />
    )
  }

  return (
    <ScrollArea className="h-full px-4 pt-1 pb-4">
      <div ref={gridRef} className="grid grid-cols-4 gap-3">
        {users.map(c => (
          <button
            key={c.id}
            title={c.name}
            onClick={() => openChat(c)}
            style={{ opacity: 0 }}
            className="transition-transform duration-150 hover:scale-105 active:scale-95"
          >
            <ContactAvatar contact={c} />
          </button>
        ))}
      </div>
    </ScrollArea>
  )
}
