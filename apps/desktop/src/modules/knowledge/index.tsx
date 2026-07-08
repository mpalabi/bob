import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, FileText, Trash2, BookOpen, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { ScrollArea, Text, Button } from '../../components/ui'
import { cn } from '../../lib/utils'

interface KnowledgeDoc {
  id: string
  name: string
  mimeType: string
  size: number
  status: 'processing' | 'ready' | 'error'
  chunkCount: number
  createdAt: string
}

const ACCEPTED = '.txt,.md,.ts,.tsx,.js,.jsx,.json,.csv,.py,.go,.rs,.rb,.java,.c,.cpp,.h,.sh,.yaml,.yml,.toml,.pdf'

function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function StatusIcon({ status }: { status: KnowledgeDoc['status'] }) {
  if (status === 'ready') return <CheckCircle size={13} className="text-green-500 shrink-0" />
  if (status === 'processing') return <Loader2 size={13} className="text-text-tertiary shrink-0 animate-spin" />
  return <AlertCircle size={13} className="text-red-400 shrink-0" />
}

export default function KnowledgeModule() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    api.get<KnowledgeDoc[]>('/knowledge')
      .then(r => setDocs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    // Poll for processing docs
    const id = setInterval(() => {
      if (docs.some(d => d.status === 'processing')) load()
    }, 3000)
    return () => clearInterval(id)
  }, [load, docs])

  const upload = useCallback(async (files: FileList | null) => {
    if (!files || uploading) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const form = new FormData()
        form.append('file', file)
        await api.post('/knowledge/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }
      load()
    } catch {
      // show nothing — the file just won't appear
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [uploading, load])

  const remove = useCallback(async (id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id))
    await api.delete(`/knowledge/${id}`).catch(() => load())
  }, [load])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    upload(e.dataTransfer.files)
  }, [upload])

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={20} className="animate-spin text-text-tertiary" />
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-6 py-12">
            <div className="w-12 h-12 rounded-2xl bg-bg-subtle flex items-center justify-center text-text-tertiary">
              <BookOpen size={22} />
            </div>
            <div>
              <Text variant="subheading" className="font-semibold">No documents yet</Text>
              <Text variant="body" color="tertiary" className="mt-1 text-sm">
                Upload files and the AI will use them as context when you chat.
              </Text>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {docs.map(doc => (
              <div
                key={doc.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-bg-subtle border border-border group"
              >
                <FileText size={16} className="text-text-tertiary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{doc.name}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {fmt(doc.size)}
                    {doc.status === 'ready' && ` · ${doc.chunkCount} chunks`}
                    {doc.status === 'processing' && ' · indexing…'}
                    {doc.status === 'error' && ' · failed'}
                  </p>
                </div>
                <StatusIcon status={doc.status} />
                <button
                  onClick={() => remove(doc.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-text-tertiary hover:text-red-400"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Drop zone / upload area */}
      <div className="flex-shrink-0 px-4 pb-4">
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
            dragOver
              ? 'border-text-primary bg-bg-subtle'
              : 'border-border hover:border-border-strong hover:bg-bg-subtle'
          )}
        >
          {uploading ? (
            <Loader2 size={18} className="animate-spin text-text-tertiary" />
          ) : (
            <Upload size={18} className="text-text-tertiary" />
          )}
          <Text variant="caption" color="tertiary" className="text-center">
            {uploading ? 'Uploading…' : 'Drop files or click to upload'}
          </Text>
          <Text variant="caption" color="tertiary" className="text-center text-[10px]">
            PDF, Markdown, code, text — up to 20 MB
          </Text>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={e => upload(e.target.files)}
        />
      </div>
    </div>
  )
}
