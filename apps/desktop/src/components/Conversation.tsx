import { useEffect, useRef, useState } from 'react'
import { Send, MessagesSquare } from 'lucide-react'
import { cn } from '../lib/utils'
import { ScrollArea, EmptyState, Button } from './ui'
import { pop } from '../lib/animations'
import { useChatStore } from '../store/chat'
import { useAuthStore } from '../store/auth'
import type { Contact } from '../lib/contacts'

interface ConversationProps {
  contact: Contact
}

export function Conversation({ contact }: ConversationProps) {
  const myId = useAuthStore(s => s.user?.id)
  const messages = useChatStore(s => s.conversations[contact.id] ?? [])
  const sendMessage = useChatStore(s => s.sendMessage)
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const sendRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, contact.id])

  const send = () => {
    const text = draft.trim()
    if (!text) return
    sendMessage(contact.id, text)
    setDraft('')
    if (sendRef.current) pop(sendRef.current)
  }

  const firstName = contact.name.split(' ')[0]

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4 py-3">
        {messages.length === 0 ? (
          <EmptyState
            className="h-full"
            icon={<MessagesSquare size={22} />}
            title={`Message ${firstName}`}
            description={`This is the start of your conversation with ${firstName}.`}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map(m => (
              <div
                key={m.id}
                className={cn(
                  'max-w-[78%] px-3 py-2 rounded-2xl text-base leading-snug break-words',
                  m.senderId === myId
                    ? 'self-end bg-text-primary text-bg-base rounded-br-md'
                    : 'self-start bg-bg-subtle text-text-primary rounded-bl-md'
                )}
              >
                {m.content}
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </ScrollArea>

      {/* Composer */}
      <div className="flex-shrink-0 px-3 py-3 flex items-center gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={`Message ${firstName}`}
          className="flex-1 min-w-0 h-9 px-3.5 rounded-full bg-bg-input border border-border
                     outline-none text-base text-text-primary placeholder:text-text-tertiary
                     focus:border-border-strong transition-colors"
        />
        <Button
          ref={sendRef}
          aria-label="Send"
          onClick={send}
          disabled={!draft.trim()}
          size="icon-lg"
          className="rounded-full flex-shrink-0"
        >
          <Send size={16} />
        </Button>
      </div>
    </div>
  )
}
