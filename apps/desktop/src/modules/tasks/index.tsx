import { useEffect, useRef, useState } from 'react'
import { ListTodo, Plus, Check, X, FolderOpen, ChevronDown, Trash2, Play, ArrowRight } from 'lucide-react'
import type { Task, Project } from '@bob/shared'
import { ScrollArea, EmptyState, Spinner, Badge, Button } from '../../components/ui'
import { cn } from '../../lib/utils'
import { useTasksStore } from '../../store/tasks'

const PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#64748b',
]

const priorityVariant = { high: 'destructive', medium: 'warning', low: 'default' } as const

function formatDate(iso: string): { label: string; overdue: boolean; today: boolean } {
  const d = new Date(iso)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((dStart.getTime() - todayStart.getTime()) / 86400000)
  const overdue = diff < 0
  const today = diff === 0
  const label = today
    ? 'Today'
    : diff === 1
      ? 'Tomorrow'
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return { label, overdue, today }
}

function DatePicker({
  value, placeholder, onChange, onClear, colorize = false,
}: {
  value?: string
  placeholder: string
  onChange: (iso: string) => void
  onClear: () => void
  colorize?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  const localValue = value ? new Date(value).toISOString().slice(0, 16) : ''
  const fmt = value ? formatDate(value) : null

  const colorClass = colorize && fmt
    ? fmt.overdue
      ? 'text-red-400 bg-red-400/10 hover:bg-red-400/20'
      : fmt.today
        ? 'text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20'
        : 'text-text-secondary bg-bg-subtle hover:bg-bg-overlay'
    : value
      ? 'text-text-secondary bg-bg-subtle hover:bg-bg-overlay'
      : 'text-text-tertiary hover:bg-bg-subtle'

  return (
    <div className="relative flex items-center gap-0.5">
      <button
        onClick={() => ref.current?.showPicker?.() ?? ref.current?.click()}
        className={cn('px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors', colorClass)}
      >
        {fmt?.label ?? placeholder}
      </button>

      {value && (
        <button
          onClick={onClear}
          className="text-text-tertiary hover:text-text-primary opacity-0 group-hover/task:opacity-100 transition-opacity"
        >
          <X size={9} strokeWidth={2.5} />
        </button>
      )}

      <input
        ref={ref}
        type="datetime-local"
        value={localValue}
        onChange={e => e.target.value && onChange(new Date(e.target.value).toISOString())}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        style={{ colorScheme: 'dark' }}
      />
    </div>
  )
}

export default function TasksModule() {
  const tasks           = useTasksStore(s => s.tasks)
  const projects        = useTasksStore(s => s.projects)
  const activeProjectId = useTasksStore(s => s.activeProjectId)
  const loading         = useTasksStore(s => s.loading)
  const init            = useTasksStore(s => s.init)
  const create          = useTasksStore(s => s.create)
  const toggle          = useTasksStore(s => s.toggle)
  const remove          = useTasksStore(s => s.remove)
  const updateTask      = useTasksStore(s => s.update)
  const focusTask       = useTasksStore(s => s.focusTask)
  const setActive       = useTasksStore(s => s.setActiveProject)
  const createProject   = useTasksStore(s => s.createProject)
  const removeProject   = useTasksStore(s => s.removeProject)
  const activeTasks     = useTasksStore(s => s.activeTasks)

  const [draft, setDraft]                   = useState('')
  const [draftStart, setDraftStart]         = useState<string | undefined>()
  const [draftDue, setDraftDue]             = useState<string | undefined>()
  const [projectDraft, setProjectDraft]     = useState('')
  const [projectColor, setProjectColor]     = useState(PALETTE[0])
  const [showNewProject, setShowNewProject] = useState(false)
  const [projectMenuOpen, setProjectMenuOpen] = useState(false)
  const projectMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { init() }, [init])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node))
        setProjectMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const activeProject = projects.find(p => p.id === activeProjectId) ?? null
  const displayed = activeTasks()

  const add = () => {
    const text = draft.trim()
    if (!text) return
    create(text, 'medium', activeProjectId ?? undefined, draftStart, draftDue)
    setDraft('')
    setDraftStart(undefined)
    setDraftDue(undefined)
  }

  const addProject = async () => {
    const name = projectDraft.trim()
    if (!name) return
    await createProject(name, projectColor)
    setProjectDraft('')
    setProjectColor(PALETTE[0])
    setShowNewProject(false)
  }

  return (
    <div className="flex flex-col h-full">

      {/* Project selector */}
      <div className="flex-shrink-0 px-3 pt-2 pb-1 flex items-center gap-2">
        <div className="relative flex-1 min-w-0" ref={projectMenuRef}>
          <button
            onClick={() => setProjectMenuOpen(v => !v)}
            className="flex items-center gap-1.5 w-full h-8 px-2.5 rounded-lg
                       bg-bg-subtle border border-border text-xs font-medium
                       text-text-secondary hover:border-border-strong transition-colors"
          >
            {activeProject
              ? <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: activeProject.color }} />
              : <FolderOpen size={12} className="text-text-tertiary flex-shrink-0" />
            }
            <span className="flex-1 text-left truncate">{activeProject?.name ?? 'All tasks'}</span>
            <ChevronDown size={11} strokeWidth={2.5} className="flex-shrink-0 text-text-tertiary" />
          </button>

          {projectMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-full rounded-xl border border-border
                            bg-bg-base shadow-lg overflow-hidden z-50">
              <div className="py-1 max-h-48 overflow-y-auto">
                <button
                  onClick={() => { setActive(null); setProjectMenuOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors',
                    !activeProjectId ? 'bg-bg-subtle text-text-primary font-medium' : 'text-text-secondary hover:bg-bg-subtle'
                  )}
                >
                  <FolderOpen size={12} className="text-text-tertiary" />
                  All tasks
                  <span className="ml-auto text-text-tertiary font-normal">{tasks.length}</span>
                </button>

                {projects.map(p => (
                  <div
                    key={p.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 cursor-pointer group transition-colors',
                      p.id === activeProjectId ? 'bg-bg-subtle text-text-primary font-medium' : 'text-text-secondary hover:bg-bg-subtle'
                    )}
                    onClick={() => { setActive(p.id); setProjectMenuOpen(false) }}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                    <span className="flex-1 text-xs truncate">{p.name}</span>
                    <span className="text-[10px] text-text-tertiary font-normal">
                      {tasks.filter(t => t.projectId === p.id).length}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); removeProject(p.id) }}
                      className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-destructive transition-all ml-1"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>

              {showNewProject ? (
                <div className="border-t border-border p-2 flex flex-col gap-2">
                  <input
                    autoFocus
                    value={projectDraft}
                    onChange={e => setProjectDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); addProject() }
                      if (e.key === 'Escape') setShowNewProject(false)
                    }}
                    placeholder="Project name…"
                    className="w-full h-7 px-2.5 rounded-md bg-bg-input border border-border
                               text-xs text-text-primary placeholder:text-text-tertiary outline-none
                               focus:border-border-strong transition-colors"
                  />
                  <div className="flex items-center gap-1.5">
                    {PALETTE.map(c => (
                      <button
                        key={c}
                        onClick={() => setProjectColor(c)}
                        className={cn('w-4 h-4 rounded-full transition-transform', projectColor === c && 'ring-2 ring-offset-1 ring-offset-bg-base scale-110')}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" className="flex-1 h-7 text-xs" onClick={addProject} disabled={!projectDraft.trim()}>Create</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowNewProject(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewProject(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 border-t border-border
                             text-xs text-text-tertiary hover:text-text-primary hover:bg-bg-subtle transition-colors"
                >
                  <Plus size={12} />
                  New project
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Task composer */}
      <div className="flex-shrink-0 px-3 pb-2">
        <div className="flex items-center gap-2 mb-1.5">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
            placeholder={activeProject ? `Add task to ${activeProject.name}…` : 'Add a task…'}
            className="flex-1 min-w-0 h-9 px-3.5 rounded-full bg-bg-input border border-border
                       outline-none text-base text-text-primary placeholder:text-text-tertiary
                       focus:border-border-strong transition-colors"
          />
          <Button aria-label="Add task" onClick={add} disabled={!draft.trim()} size="icon-lg" className="rounded-full flex-shrink-0">
            <Plus size={16} />
          </Button>
        </div>

        {/* Start → End date for new task */}
        <div className="flex items-center gap-1 pl-1">
          <DatePicker
            value={draftStart}
            placeholder="Start"
            onChange={setDraftStart}
            onClear={() => setDraftStart(undefined)}
          />
          {(draftStart || draftDue) && (
            <ArrowRight size={10} className="text-text-tertiary flex-shrink-0" />
          )}
          <DatePicker
            value={draftDue}
            placeholder="End"
            onChange={setDraftDue}
            onClear={() => setDraftDue(undefined)}
            colorize
          />
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-hidden">
        {loading && displayed.length === 0 ? (
          <div className="flex items-center justify-center h-full"><Spinner size="md" /></div>
        ) : displayed.length === 0 ? (
          <EmptyState
            className="h-full"
            icon={<ListTodo size={22} />}
            title={activeProject ? `No tasks in ${activeProject.name}` : 'No tasks yet'}
            description="Add your first task above."
          />
        ) : (
          <ScrollArea className="h-full px-3 pb-3">
            <div className="flex flex-col gap-1">
              {displayed.map((task: Task) => {
                const done = task.status === 'done'
                const project = projects.find(p => p.id === task.projectId)
                const hasDate = task.startAt || task.dueAt

                return (
                  <div key={task.id} className="group/task flex items-start gap-2.5 px-2 py-1.5 rounded-md hover:bg-bg-subtle">
                    <button
                      aria-label={done ? 'Mark as not done' : 'Mark as done'}
                      onClick={() => toggle(task)}
                      className={cn(
                        'flex-shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors',
                        done ? 'bg-text-primary border-text-primary text-bg-base' : 'border-border hover:border-border-strong'
                      )}
                    >
                      {done && <Check size={11} strokeWidth={3} />}
                    </button>

                    {!done && (
                      <button
                        aria-label="Focus on this task"
                        onClick={() => focusTask(task)}
                        className="flex-shrink-0 mt-0.5 text-text-tertiary opacity-0 group-hover/task:opacity-100 hover:text-text-primary transition-opacity"
                        title="Focus on this task"
                      >
                        <Play size={11} strokeWidth={2} fill="currentColor" />
                      </button>
                    )}

                    <div className="flex-1 min-w-0">
                      <span className={cn('text-sm truncate block', done && 'line-through text-text-tertiary')}>
                        {task.title}
                      </span>

                      {/* Start → End date row */}
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <DatePicker
                          value={task.startAt}
                          placeholder="Start"
                          onChange={iso => updateTask(task.id, { startAt: iso })}
                          onClear={() => updateTask(task.id, { startAt: null })}
                        />
                        {(task.startAt || task.dueAt) && (
                          <ArrowRight size={9} className="text-text-tertiary flex-shrink-0" />
                        )}
                        <DatePicker
                          value={task.dueAt}
                          placeholder="End"
                          onChange={iso => updateTask(task.id, { dueAt: iso })}
                          onClear={() => updateTask(task.id, { dueAt: null })}
                          colorize
                        />
                        {!activeProjectId && project && (
                          <span className="flex items-center gap-1 text-[10px] text-text-tertiary ml-1">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: project.color }} />
                            {project.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {!done && <Badge variant={priorityVariant[task.priority]} className="flex-shrink-0 mt-0.5">{task.priority}</Badge>}

                    <button
                      aria-label="Delete task"
                      onClick={() => remove(task.id)}
                      className="flex-shrink-0 mt-0.5 text-text-tertiary opacity-0 group-hover/task:opacity-100 hover:text-destructive transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
