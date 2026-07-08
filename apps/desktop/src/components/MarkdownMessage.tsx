import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '../lib/utils'

interface Props {
  content: string
  className?: string
}

export function MarkdownMessage({ content, className }: Props) {
  return (
    <div className={cn('markdown-body', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className: cls, children, ...props }) {
            const isBlock = cls?.startsWith('language-')
            const lang = cls?.replace('language-', '') ?? ''
            const text = String(children).replace(/\n$/, '')
            if (isBlock) return <CodeBlock lang={lang} code={text} />
            return (
              <code
                className="bg-bg-subtle text-text-primary rounded px-1 py-0.5 font-mono text-[0.8em] border border-border"
                {...props}
              >
                {children}
              </code>
            )
          },
          pre({ children }) {
            return <>{children}</>
          },
          p({ children }) {
            return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
          },
          h1({ children }) {
            return <h1 className="text-base font-bold mb-2 mt-3 first:mt-0 text-text-primary">{children}</h1>
          },
          h2({ children }) {
            return <h2 className="text-sm font-semibold mb-1.5 mt-2.5 first:mt-0 text-text-primary">{children}</h2>
          },
          h3({ children }) {
            return <h3 className="text-sm font-medium mb-1 mt-2 first:mt-0 text-text-secondary">{children}</h3>
          },
          ul({ children }) {
            return <ul className="mb-2 last:mb-0 pl-4 space-y-0.5 list-disc marker:text-text-tertiary">{children}</ul>
          },
          ol({ children }) {
            return <ol className="mb-2 last:mb-0 pl-4 space-y-0.5 list-decimal marker:text-text-tertiary">{children}</ol>
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-border-strong pl-3 my-2 text-text-secondary italic">
                {children}
              </blockquote>
            )
          },
          strong({ children }) {
            return <strong className="font-semibold text-text-primary">{children}</strong>
          },
          em({ children }) {
            return <em className="italic text-text-secondary">{children}</em>
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                className="text-text-primary underline underline-offset-2 hover:opacity-70 transition-opacity"
                target="_blank"
                rel="noreferrer"
              >
                {children}
              </a>
            )
          },
          table({ children }) {
            return (
              <div className="my-2 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">{children}</table>
              </div>
            )
          },
          thead({ children }) {
            return <thead className="bg-bg-subtle border-b border-border">{children}</thead>
          },
          th({ children }) {
            return <th className="px-3 py-1.5 text-left font-semibold text-text-secondary">{children}</th>
          },
          td({ children }) {
            return <td className="px-3 py-1.5 border-t border-border text-text-primary">{children}</td>
          },
          hr() {
            return <hr className="my-3 border-border" />
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="my-2 rounded-xl border border-border overflow-hidden bg-[hsl(0,0%,9%)]">
      {lang && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-bg-subtle">
          <span className="text-[10px] font-mono text-text-tertiary tracking-wide uppercase">{lang}</span>
          <button
            onClick={copy}
            className="flex items-center gap-1 text-[10px] text-text-tertiary hover:text-text-secondary transition-colors"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
      {!lang && (
        <button
          onClick={copy}
          className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-text-tertiary hover:text-text-secondary transition-colors"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
        </button>
      )}
      <pre className="px-3 py-2.5 overflow-x-auto text-[0.78rem] font-mono leading-relaxed text-text-primary whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  )
}
