import { lazy, Suspense, useState } from 'react'
import { MessageCircle, Sparkles, ListTodo, Search, ArrowLeft, Settings, BookOpen } from 'lucide-react'
import { Spinner, Button, Text } from './ui'
import { ContactAvatar } from './ContactAvatar'
import { Conversation } from './Conversation'
import { useChatStore } from '../store/chat'
import { cn } from '../lib/utils'

const ChatModule = lazy(() => import('../modules/chat'))
const AiChatModule = lazy(() => import('../modules/ai-chat'))
const TasksModule = lazy(() => import('../modules/tasks'))

export type PanelTab = 'chat' | 'ai' | 'tasks'

interface WidgetPanelProps {
  open: boolean
  onClose: () => void
  onSearch: () => void
}

const panels: Record<PanelTab, React.LazyExoticComponent<() => JSX.Element>> = {
  chat: ChatModule,
  ai: AiChatModule,
  tasks: TasksModule,
}

const titles: Record<PanelTab, { crumb: string; leaf: string }> = {
  chat: { crumb: 'Chats', leaf: 'Contacts' },
  ai: { crumb: 'Assistant', leaf: 'AI' },
  tasks: { crumb: 'Tasks', leaf: 'Today' },
}

const navIcons: { key: PanelTab; label: string; Icon: typeof MessageCircle }[] = [
  { key: 'chat', label: 'Chats', Icon: MessageCircle },
  { key: 'ai', label: 'AI', Icon: Sparkles },
  { key: 'tasks', label: 'Tasks', Icon: ListTodo },
]

export function WidgetPanel({ open, onClose, onSearch }: WidgetPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('chat')
  const activeContact = useChatStore(s => s.activeContact)
  const closeChat = useChatStore(s => s.closeChat)
  const ActiveModule = panels[activeTab]
  const title = titles[activeTab]

  return (
    <div className="w-full h-full flex flex-col bg-bg-base rounded-2xl overflow-hidden shadow-lg border border-border">
      {activeContact ? (
        <div
          className="flex items-center gap-3 px-3 h-14 flex-shrink-0 select-none"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <Button
            aria-label="Back"
            variant="ghost"
            size="icon-md"
            onClick={closeChat}
            className="flex-shrink-0 rounded-full"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <ArrowLeft size={18} strokeWidth={2} />
          </Button>
          <ContactAvatar contact={activeContact} px={32} />
          <Text variant="subheading" truncate className="font-semibold">{activeContact.name}</Text>
        </div>
      ) : (
        <div
          className="flex items-center justify-between px-4 h-14 flex-shrink-0 select-none"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <Text variant="heading">
            {title.crumb} <span className="text-text-tertiary font-normal">/ {title.leaf}</span>
          </Text>

          <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <Button
              aria-label="Search people"
              variant="ghost"
              size="icon-md"
              onClick={onSearch}
              className="rounded-full text-text-tertiary"
            >
              <Search size={18} strokeWidth={2} />
            </Button>
            {navIcons.map(({ key, label, Icon }) => (
              <Button
                key={key}
                aria-label={label}
                variant="ghost"
                size="icon-md"
                onClick={() => setActiveTab(key)}
                className={cn(
                  'rounded-full',
                  activeTab === key ? 'bg-bg-subtle text-text-primary' : 'text-text-tertiary'
                )}
              >
                <Icon size={18} strokeWidth={2} />
              </Button>
            ))}
            <Button
              aria-label="Knowledge Base"
              variant="ghost"
              size="icon-md"
              onClick={() => window.electron?.openKnowledge()}
              className="rounded-full text-text-tertiary"
            >
              <BookOpen size={18} strokeWidth={2} />
            </Button>
            <Button
              aria-label="Settings"
              variant="ghost"
              size="icon-md"
              onClick={() => window.electron?.openSettings()}
              className="rounded-full text-text-tertiary"
            >
              <Settings size={18} strokeWidth={2} />
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {activeContact ? (
          <Conversation contact={activeContact} />
        ) : (
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <Spinner size="md" />
            </div>
          }>
            <ActiveModule />
          </Suspense>
        )}
      </div>
    </div>
  )
}
