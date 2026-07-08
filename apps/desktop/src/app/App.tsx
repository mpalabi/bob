import { useState } from 'react'
import { Widget } from '../components/Widget'
import { AuthWindow } from '../windows/AuthWindow'
import { SettingsWindow } from '../windows/SettingsWindow'
import { ClipboardWindow } from '../windows/ClipboardWindow'
import { KnowledgeAppWindow } from '../windows/KnowledgeAppWindow'
import { TaskIslandWindow } from '../windows/TaskIslandWindow'

type WindowView = 'widget' | 'auth' | 'settings' | 'clipboard' | 'knowledge' | 'task-island'

function getView(): WindowView {
  const hash = window.location.hash.replace('#', '')
  if (hash === 'auth') return 'auth'
  if (hash === 'settings') return 'settings'
  if (hash === 'clipboard') return 'clipboard'
  if (hash === 'knowledge') return 'knowledge'
  if (hash === 'task-island') return 'task-island'
  return 'widget'
}

export default function App() {
  const [view] = useState<WindowView>(getView)

  if (view === 'auth') return <AuthWindow />
  if (view === 'settings') return <SettingsWindow />
  if (view === 'clipboard') return <ClipboardWindow />
  if (view === 'knowledge') return <KnowledgeAppWindow />
  if (view === 'task-island') return <TaskIslandWindow />
  return <Widget />
}
