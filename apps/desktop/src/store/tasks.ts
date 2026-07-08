import { create } from 'zustand'
import type { Task, TaskPriority, Project } from '@bob/shared'
import { api } from '../lib/api'
import { getSocket } from '../lib/socket'

interface TasksState {
  tasks: Task[]
  projects: Project[]
  activeProjectId: string | null  // null = All tasks
  loading: boolean
  wired: boolean

  init: () => Promise<void>
  setActiveProject: (id: string | null) => void

  // Tasks
  create: (title: string, priority?: TaskPriority, projectId?: string, startAt?: string, dueAt?: string) => Promise<void>
  update: (id: string, patch: Partial<{ status: string; startAt: string | null; dueAt: string | null; priority: string; title: string }>) => Promise<void>
  toggle: (task: Task) => Promise<void>
  remove: (id: string) => Promise<void>
  focusTask: (task: Task) => void

  // Projects
  createProject: (name: string, color?: string) => Promise<void>
  removeProject: (id: string) => Promise<void>

  // Derived
  activeTasks: () => Task[]
}

function upsertTask(tasks: Task[], task: Task): Task[] {
  const i = tasks.findIndex(t => t.id === task.id)
  if (i === -1) return [task, ...tasks]
  const next = tasks.slice(); next[i] = task; return next
}

function upsertProject(projects: Project[], project: Project): Project[] {
  const i = projects.findIndex(p => p.id === project.id)
  if (i === -1) return [...projects, project]
  const next = projects.slice(); next[i] = project; return next
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  projects: [],
  activeProjectId: null,
  loading: false,
  wired: false,

  init: async () => {
    if (!get().wired) {
      set({ wired: true })
      const socket = getSocket()
      socket.on('task:created', (task: Task) => set(s => ({ tasks: upsertTask(s.tasks, task) })))
      socket.on('task:updated', (task: Task) => set(s => ({ tasks: upsertTask(s.tasks, task) })))
      socket.on('task:deleted', (id: string) => set(s => ({ tasks: s.tasks.filter(t => t.id !== id) })))
      socket.on('project:created', (p: Project) => set(s => ({ projects: upsertProject(s.projects, p) })))
      socket.on('project:updated', (p: Project) => set(s => ({ projects: upsertProject(s.projects, p) })))
      socket.on('project:deleted', (id: string) => set(s => ({
        projects: s.projects.filter(p => p.id !== id),
        activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
      })))
    }

    set({ loading: true })
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        api.get<Task[]>('/tasks'),
        api.get<Project[]>('/projects'),
      ])
      set({ tasks: tasksRes.data, projects: projectsRes.data, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  setActiveProject: (id) => set({ activeProjectId: id }),

  activeTasks: () => {
    const { tasks, activeProjectId } = get()
    if (!activeProjectId) return tasks
    return tasks.filter(t => t.projectId === activeProjectId)
  },

  create: async (title, priority = 'medium', projectId, startAt, dueAt) => {
    const trimmed = title.trim()
    if (!trimmed) return
    await api.post('/tasks', { title: trimmed, priority, projectId, startAt, dueAt })
  },

  update: async (id, patch) => {
    await api.patch(`/tasks/${id}`, patch)
  },

  toggle: async (task) => {
    const status = task.status === 'done' ? 'todo' : 'done'
    await api.patch(`/tasks/${task.id}`, { status })
  },

  remove: async (id) => {
    await api.delete(`/tasks/${id}`)
  },

  createProject: async (name, color) => {
    const trimmed = name.trim()
    if (!trimmed) return
    await api.post('/projects', { name: trimmed, color })
  },

  removeProject: async (id) => {
    await api.delete(`/projects/${id}`)
  },

  focusTask: (task) => {
    window.electron?.taskIslandSet({ id: task.id, title: task.title, priority: task.priority })
  },
}))
