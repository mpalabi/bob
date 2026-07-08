import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Sparkles, Plus, Mic, ChevronDown, Square, X, FileText, ChevronRight, Trash2, MessageSquare, Copy, Bookmark, RotateCcw, Check } from 'lucide-react'
import { cn } from '../../lib/utils'
import { ScrollArea, Button, Text } from '../../components/ui'
import { SplitText } from '../../components/text/SplitText'
import { pop } from '../../lib/animations'
import { useAiStore, type AiAttachment } from '../../store/ai'
import { MarkdownMessage } from '../../components/MarkdownMessage'
import { ToolCallCard } from '../../components/ToolCallCard'
import { useAiSettings } from '../../hooks/useAiSettings'
import { AI_PROVIDERS } from '@bob/shared'

const SUGGESTIONS = [
  "Draft my standup update",
  "What's the latest on AI news?",
  "Summarize a long thread",
  "Write a commit message",
]

const ACCEPTED = 'image/*,.pdf,.txt,.md,.ts,.tsx,.js,.jsx,.json,.csv,.py,.go,.rs,.rb,.java,.c,.cpp,.h,.sh,.yaml,.yml,.toml,.env'
const MAX_FILE_MB = 20

// Returns true for files whose content is human-readable text
function isTextFile(file: File) {
  const textMimes = ['text/', 'application/json', 'application/javascript', 'application/typescript', 'application/xml']
  if (textMimes.some(m => file.type.startsWith(m))) return true
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return ['txt','md','ts','tsx','js','jsx','json','csv','py','go','rs','rb','java','c','cpp','h','sh','yaml','yml','toml','env','xml','html','css','sql','log'].includes(ext)
}

export default function AiChatModule() {
  const sessions = useAiStore(s => s.sessions)
  const activeId = useAiStore(s => s.activeId)
  const activeSession = useAiStore(s => s.activeSession())
  const streaming = useAiStore(s => s.streaming)
  const send = useAiStore(s => s.send)
  const newSession = useAiStore(s => s.newSession)
  const switchSession = useAiStore(s => s.switchSession)
  const deleteSession = useAiStore(s => s.deleteSession)

  const { settings, allProviders, updateModel } = useAiSettings()

  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState<AiAttachment[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [modelOpen, setModelOpen] = useState(false)
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
  const [sessionsOpen, setSessionsOpen] = useState(false)

  const endRef = useRef<HTMLDivElement>(null)
  const sendRef = useRef<HTMLButtonElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const modelRef = useRef<HTMLDivElement>(null)
  const sessionsRef = useRef<HTMLDivElement>(null)

  const messages = activeSession?.messages ?? []
  const empty = messages.length === 0

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  useEffect(() => {
    if (settings?.provider && !expandedProvider) setExpandedProvider(settings.provider)
  }, [settings?.provider])

  // Close popovers on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false)
      if (sessionsRef.current && !sessionsRef.current.contains(e.target as Node)) setSessionsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const submit = () => {
    if ((!draft.trim() && attachments.length === 0) || streaming) return
    send(draft, attachments)
    setDraft('')
    setAttachments([])
    if (sendRef.current) pop(sendRef.current)
  }

  const handleFiles = useCallback(async (files: FileList | File[] | null) => {
    if (!files) return
    setFileError(null)
    const next: AiAttachment[] = []
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setFileError(`"${file.name}" is too large (max ${MAX_FILE_MB} MB)`)
        continue
      }
      const isImage = file.type.startsWith('image/')
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      const useBase64 = isImage || isPdf

      const data: string = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        if (useBase64) {
          reader.onload = () => resolve((reader.result as string).split(',')[1])
          reader.readAsDataURL(file)
        } else {
          reader.onload = () => resolve(reader.result as string)
          reader.readAsText(file)
        }
        reader.onerror = reject
      })

      next.push({
        type: isImage ? 'image' : 'file',
        name: file.name,
        mediaType: isPdf ? 'application/pdf' : isImage ? file.type : undefined,
        data,
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
      })
    }
    setAttachments(prev => [...prev, ...next])
  }, [])

  const removeAttachment = (idx: number) => {
    setAttachments(prev => {
      const copy = [...prev]
      const att = copy.splice(idx, 1)[0]
      if (att.previewUrl) URL.revokeObjectURL(att.previewUrl)
      return copy
    })
  }

  const currentProviderInfo = allProviders.find(p => p.id === (settings?.provider ?? 'deepseek'))
  const modelLabel = settings?.model ?? currentProviderInfo?.defaultModel ?? 'deepseek-chat'

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files)
    if (files.length > 0) {
      e.preventDefault()
      handleFiles(files)
    }
  }, [handleFiles])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  return (
    <div
      className="flex flex-col h-full relative"
      onPaste={onPaste}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) }}
      onDrop={onDrop}
    >
      {dragOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-2
                        bg-bg-base/80 backdrop-blur-sm border-2 border-dashed border-accent rounded-xl pointer-events-none">
          <FileText size={28} className="text-accent" />
          <span className="text-sm font-medium text-accent">Drop files to attach</span>
        </div>
      )}

      {/* Header: session switcher + new chat */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-1 flex-shrink-0">
        <div className="relative flex-1 min-w-0" ref={sessionsRef}>
          <button
            onClick={() => setSessionsOpen(v => !v)}
            className="flex items-center gap-1.5 px-2 h-7 rounded-lg w-full text-left
                       text-xs font-medium text-text-secondary hover:bg-bg-subtle transition-colors truncate"
          >
            <MessageSquare size={12} className="shrink-0 text-text-tertiary" />
            <span className="truncate flex-1">{activeSession?.title ?? 'New chat'}</span>
            <ChevronDown size={11} strokeWidth={2.5} className="shrink-0 text-text-tertiary" />
          </button>

          {sessionsOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 rounded-xl border border-border
                            bg-bg-base shadow-lg overflow-hidden z-50">
              <div className="py-1 max-h-56 overflow-y-auto">
                {sessions.map(s => (
                  <div
                    key={s.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 cursor-pointer group transition-colors',
                      s.id === activeId ? 'bg-bg-subtle' : 'hover:bg-bg-subtle'
                    )}
                    onClick={() => { switchSession(s.id); setSessionsOpen(false) }}
                  >
                    <span className={cn(
                      'flex-1 text-xs truncate',
                      s.id === activeId ? 'text-text-primary font-medium' : 'text-text-secondary'
                    )}>
                      {s.title}
                    </span>
                    {sessions.length > 1 && (
                      <button
                        onClick={e => { e.stopPropagation(); deleteSession(s.id) }}
                        className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-red-400 transition-all"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon-md"
          onClick={() => { newSession(); setSessionsOpen(false) }}
          className="rounded-lg text-text-tertiary hover:text-text-primary flex-shrink-0"
          aria-label="New chat"
        >
          <Plus size={15} />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4 py-2">
        {empty ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4 px-4">
            <div className="w-12 h-12 rounded-2xl bg-bg-subtle flex items-center justify-center text-text-primary">
              <Sparkles size={22} />
            </div>
            <div>
              <SplitText text="Ask Bob anything" className="text-md font-semibold text-text-primary" />
              <Text variant="body" color="tertiary" className="mt-1">
                Your AI assistant, right in the widget.
              </Text>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-1">
              {SUGGESTIONS.map(s => (
                <Button key={s} variant="outline" size="sm" className="rounded-full" onClick={() => setDraft(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {messages.map((m, msgIdx) => {
              const isAssistant = m.role === 'assistant'
              const hasTools = isAssistant && (m.tools?.length ?? 0) > 0
              const toolsRunning = isAssistant && m.tools?.some(t => t.status === 'running')
              const pending = isAssistant && streaming && m.text === '' && !hasTools
              const isLastAssistant = isAssistant && msgIdx === messages.length - 1 && streaming

              return (
                <div key={m.id} className={cn('flex flex-col group/msg', isAssistant ? 'items-start' : 'items-end')}>
                  {!isAssistant && m.attachments && m.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1 max-w-[82%] justify-end">
                      {m.attachments.map((att, i) => (
                        att.type === 'image' && att.previewUrl ? (
                          <img key={i} src={att.previewUrl} alt={att.name}
                            className="h-20 w-20 rounded-lg object-cover border border-border" />
                        ) : (
                          <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg-subtle border border-border">
                            <FileText size={13} className={att.mediaType === 'application/pdf' ? 'text-red-400 shrink-0' : 'text-text-tertiary shrink-0'} />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs text-text-secondary truncate max-w-[120px]">{att.name}</span>
                              {att.mediaType === 'application/pdf' && <span className="text-[10px] text-red-400 leading-tight">PDF</span>}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  )}

                  {hasTools && (
                    <div className="w-full max-w-[82%] mb-1">
                      {m.tools!.map(t => <ToolCallCard key={t.id} tool={t} />)}
                    </div>
                  )}

                  {(m.text || pending || (!streaming && isAssistant)) && (
                    <div className={cn(
                      'max-w-[82%] px-3 py-2 rounded-2xl text-base leading-snug break-words',
                      isAssistant
                        ? 'self-start bg-bg-subtle text-text-primary rounded-bl-md'
                        : 'self-end bg-text-primary text-bg-base rounded-br-md whitespace-pre-wrap'
                    )}>
                      {pending || (toolsRunning && !m.text) ? <TypingDots /> :
                        isAssistant ? <MarkdownMessage content={m.text} /> : m.text}
                    </div>
                  )}

                  {/* Action bar — assistant messages only, not while streaming */}
                  {isAssistant && m.text && !isLastAssistant && (
                    <MessageActions text={m.text} onRetry={() => {
                      const userMsg = messages[msgIdx - 1]
                      if (userMsg) send(userMsg.text, userMsg.attachments)
                    }} />
                  )}
                </div>
              )
            })}
            <div ref={endRef} />
          </div>
        )}
      </ScrollArea>

      {/* Composer */}
      <div className="flex-shrink-0 px-3 pb-3">
        {fileError && (
          <div className="mb-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            <X size={11} strokeWidth={2.5} className="shrink-0" />
            {fileError}
            <button onClick={() => setFileError(null)} className="ml-auto opacity-60 hover:opacity-100"><X size={10} /></button>
          </div>
        )}
        <div className="rounded-xl border border-border bg-bg-input flex flex-col focus-within:border-border-strong transition-colors">

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-3 pt-2.5">
              {attachments.map((att, i) => (
                <div key={i} className="relative group">
                  {att.type === 'image' && att.previewUrl ? (
                    <div className="relative">
                      <img src={att.previewUrl} alt={att.name}
                        className="h-14 w-14 rounded-lg object-cover border border-border" />
                      <button onClick={() => removeAttachment(i)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-text-primary text-bg-base
                                   flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={9} strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-bg-subtle border border-border max-w-[160px]">
                      <FileText size={12} className={att.mediaType === 'application/pdf' ? 'text-red-400 shrink-0' : 'text-text-tertiary shrink-0'} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs text-text-secondary truncate leading-tight">{att.name}</span>
                        {att.mediaType === 'application/pdf' && (
                          <span className="text-[10px] text-red-400 leading-tight">PDF</span>
                        )}
                      </div>
                      <button onClick={() => removeAttachment(i)}
                        className="w-4 h-4 rounded flex items-center justify-center text-text-tertiary hover:text-text-primary shrink-0">
                        <X size={10} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <textarea
            value={draft}
            rows={2}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
            placeholder="How can I help you today?"
            className="w-full px-4 pt-3 pb-1 bg-transparent resize-none outline-none
                       text-sm text-text-primary placeholder:text-text-tertiary leading-relaxed"
            style={{ minHeight: 56, maxHeight: 140 }}
          />

          <div className="flex items-center justify-between px-2 pb-2 pt-1">
            <button onClick={() => fileRef.current?.click()}
              className="w-7 h-7 flex items-center justify-center rounded-md
                         text-text-tertiary hover:text-text-primary hover:bg-bg-subtle transition-colors"
              title="Attach file or image">
              <Plus size={16} strokeWidth={2} />
            </button>
            <input ref={fileRef} type="file" multiple accept={ACCEPTED} className="hidden"
              onChange={e => handleFiles(e.target.files)} />

            <div className="flex items-center gap-1">
              <div className="relative" ref={modelRef}>
                <button onClick={() => setModelOpen(v => !v)}
                  className="flex items-center gap-1 px-2 h-7 rounded-md text-xs font-medium
                             text-text-secondary hover:bg-bg-subtle transition-colors">
                  <span className="max-w-[140px] truncate">{modelLabel}</span>
                  <ChevronDown size={11} strokeWidth={2.5} />
                </button>

                {modelOpen && (
                  <div className="absolute bottom-full right-0 mb-1 w-60 rounded-xl border border-border
                                  bg-bg-base shadow-lg overflow-hidden z-50">
                    <div className="py-1 max-h-64 overflow-y-auto">
                      {allProviders.map(provider => (
                        <div key={provider.id}>
                          <button
                            className="w-full flex items-center justify-between px-3 py-2
                                       text-xs font-medium text-text-secondary hover:bg-bg-subtle transition-colors"
                            onClick={() => setExpandedProvider(expandedProvider === provider.id ? null : provider.id)}
                          >
                            <span>{provider.label}</span>
                            <ChevronRight size={12} className={cn('transition-transform', expandedProvider === provider.id && 'rotate-90')} />
                          </button>
                          {(expandedProvider === provider.id) && (
                            <div className="pb-1">
                              {provider.models.map(model => {
                                const active = settings?.provider === provider.id && settings?.model === model
                                return (
                                  <button key={model}
                                    onClick={() => { updateModel(provider.id, model); setModelOpen(false) }}
                                    className={cn(
                                      'w-full text-left px-5 py-1.5 text-xs transition-colors',
                                      active ? 'text-text-primary font-medium bg-bg-subtle' : 'text-text-tertiary hover:text-text-primary hover:bg-bg-subtle'
                                    )}>
                                    {model}{active && <span className="ml-2 text-[10px] text-text-tertiary">✓</span>}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button disabled title="Voice input — coming soon"
                className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary opacity-40 cursor-not-allowed">
                <Mic size={14} strokeWidth={2} />
              </button>

              <button ref={sendRef} onClick={submit}
                disabled={(!draft.trim() && attachments.length === 0) || streaming}
                className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-md transition-colors',
                  (draft.trim() || attachments.length > 0) && !streaming
                    ? 'bg-text-primary text-bg-base hover:opacity-80'
                    : streaming ? 'bg-bg-subtle text-text-primary' : 'text-text-tertiary hover:bg-bg-subtle'
                )}>
                {streaming ? <Square size={12} strokeWidth={2.5} fill="currentColor" /> : (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2L8 14M8 2L4 6M8 2L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageActions({ text, onRetry }: { text: string; onRetry: () => void }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div className="flex items-center gap-0.5 mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150">
      <ActionBtn onClick={copy} title="Copy">
        {copied ? <Check size={12} strokeWidth={2.5} className="text-green-400" /> : <Copy size={12} strokeWidth={2} />}
      </ActionBtn>
      <ActionBtn onClick={onRetry} title="Regenerate">
        <RotateCcw size={12} strokeWidth={2} />
      </ActionBtn>
      <ActionBtn onClick={() => {}} title="Save (coming soon)" disabled>
        <Bookmark size={12} strokeWidth={2} />
      </ActionBtn>
    </div>
  )
}

function ActionBtn({ onClick, title, disabled, children }: {
  onClick: () => void
  title: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        'w-6 h-6 flex items-center justify-center rounded-md transition-colors',
        disabled
          ? 'text-text-tertiary opacity-40 cursor-not-allowed'
          : 'text-text-tertiary hover:text-text-primary hover:bg-bg-subtle'
      )}
    >
      {children}
    </button>
  )
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-text-tertiary"
          style={{ animation: 'ai-bounce 1s ease-in-out infinite', animationDelay: `${i * 0.15}s` }} />
      ))}
      <style>{`@keyframes ai-bounce { 0%,80%,100%{opacity:.3;transform:translateY(0)} 40%{opacity:1;transform:translateY(-3px)} }`}</style>
    </span>
  )
}
