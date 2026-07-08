import { useState } from 'react'
import { Globe, ChevronDown, ChevronRight, Loader, CheckSquare, Check, FolderOpen, ListTodo, Pencil, Trash2 } from 'lucide-react'
import { cn } from '../lib/utils'
import type { ToolCall } from '../store/ai'

const TOOL_META: Record<string, { icon: React.ReactNode; label: string; detail?: (t: ToolCall) => string }> = {
  web_search:    { icon: <Globe size={12} />,    label: 'Web search',      detail: t => t.input.query as string },
  fetch_page:    { icon: <Globe size={12} />,    label: 'Fetching page',   detail: t => t.input.url as string },
  list_projects: { icon: <FolderOpen size={12} />, label: 'Listing projects' },
  list_tasks:    { icon: <ListTodo size={12} />, label: 'Listing tasks',   detail: t => (t.input.project_name as string) ?? (t.input.status as string) ?? '' },
  update_task:   { icon: <Pencil size={12} />,   label: 'Updating task',   detail: t => (t.input.title ?? t.input.status ?? t.input.priority) as string },
  delete_task:   { icon: <Trash2 size={12} />,   label: 'Deleting task' },
}

export function ToolCallCard({ tool }: { tool: ToolCall }) {
  const [open, setOpen] = useState(false)
  const running = tool.status === 'running'

  if (tool.name === 'create_task') {
    return <CreateTaskCard tool={tool} />
  }

  const meta = TOOL_META[tool.name] ?? { icon: <Globe size={12} />, label: tool.name }
  const queryLabel = meta.detail?.(tool)
    ?? (tool.input.query as string | undefined)
    ?? (tool.input.url as string | undefined)
    ?? JSON.stringify(tool.input).slice(0, 60)

  return (
    <div className="rounded-xl border border-border overflow-hidden text-xs mb-1.5">
      <button
        onClick={() => !running && setOpen(o => !o)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
          'bg-bg-overlay hover:bg-bg-subtle',
          running && 'cursor-default'
        )}
      >
        <span className={cn('text-text-tertiary', running && 'animate-pulse')}>
          {meta.icon}
        </span>
        <span className="flex-1 text-text-secondary font-medium truncate">
          {meta.label}
          <span className="text-text-tertiary font-normal ml-1">· {queryLabel}</span>
        </span>
        {running ? (
          <Loader size={11} className="text-text-tertiary animate-spin flex-shrink-0" />
        ) : (
          open
            ? <ChevronDown size={11} className="text-text-tertiary flex-shrink-0" />
            : <ChevronRight size={11} className="text-text-tertiary flex-shrink-0" />
        )}
      </button>

      {open && tool.result && (
        <div className="px-3 py-2 border-t border-border bg-[hsl(0,0%,9%)] text-text-secondary leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
          {tool.result}
        </div>
      )}
    </div>
  )
}

function CreateTaskCard({ tool }: { tool: ToolCall }) {
  const running = tool.status === 'running'
  const title = tool.input.title as string
  const priority = tool.input.priority as string | undefined
  const description = tool.input.description as string | undefined

  const priorityColor = priority === 'high'
    ? 'text-red-400'
    : priority === 'low'
      ? 'text-text-tertiary'
      : 'text-yellow-500'

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden text-xs mb-1.5 transition-colors',
      running ? 'border-border bg-bg-overlay' : 'border-border bg-bg-overlay'
    )}>
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className={cn(
          'flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all',
          running
            ? 'bg-bg-subtle text-text-tertiary'
            : 'bg-green-500/15 text-green-400'
        )}>
          {running
            ? <Loader size={11} className="animate-spin" />
            : <Check size={11} strokeWidth={2.5} />
          }
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-text-tertiary font-normal">
              {running ? 'Creating task' : 'Task created'}
            </span>
            {priority && (
              <span className={cn('text-[10px] font-medium', priorityColor)}>
                {priority}
              </span>
            )}
          </div>
          <p className="text-text-primary font-medium truncate mt-0.5">{title}</p>
          {description && (
            <p className="text-text-tertiary truncate mt-0.5 text-[11px]">{description}</p>
          )}
        </div>

        <CheckSquare
          size={13}
          className={cn('flex-shrink-0 transition-colors', running ? 'text-text-tertiary/40' : 'text-green-400')}
        />
      </div>
    </div>
  )
}
