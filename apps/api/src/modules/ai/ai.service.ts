import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import * as https from 'https'
import type { AiProvider } from '@bob/shared'
import { DEFAULT_AI_PROVIDER, AI_PROVIDERS } from '@bob/shared'
import { AiSettingsService } from './ai-settings.service'
import { KnowledgeService } from '../knowledge/knowledge.service'
import { TasksService } from '../tasks/tasks.service'
import { VisionAgent, modelSupportsVision } from './agents/vision.agent'
import {
  WEB_SEARCH_TOOL,
  FETCH_PAGE_TOOL,
  WEB_SEARCH_FUNCTION,
  FETCH_PAGE_FUNCTION,
  runWebSearch,
  runFetchPage,
  formatSearchResults,
  formatFetchResult,
} from './tools/web-search.tool'

const CREATE_TASK_TOOL: Anthropic.Messages.Tool = {
  name: 'create_task',
  description: 'Create a task in the Bob task manager. Use this when the user asks to create a task, add a to-do, or when analysing content (e.g. an image, screenshot, or discussion) and identifying actionable items.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string', description: 'Short, clear task title' },
      description: { type: 'string', description: 'Optional longer description or context' },
      priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Task priority (default: medium)' },
      project_name: { type: 'string', description: 'Optional project name to assign the task to. The project will be created if it does not exist.' },
    },
    required: ['title'],
  },
}

const CREATE_TASK_FUNCTION = {
  type: 'function' as const,
  function: {
    name: 'create_task',
    description: CREATE_TASK_TOOL.description,
    parameters: CREATE_TASK_TOOL.input_schema,
  },
}

const LIST_PROJECTS_TOOL: Anthropic.Messages.Tool = {
  name: 'list_projects',
  description: 'List all existing projects in the Bob task manager. Call this before creating a task when the user mentions a project, to find the correct existing project name rather than creating a duplicate.',
  input_schema: { type: 'object' as const, properties: {}, required: [] },
}

const LIST_TASKS_TOOL: Anthropic.Messages.Tool = {
  name: 'list_tasks',
  description: 'List tasks in the task manager. Optionally filter by project name or status.',
  input_schema: {
    type: 'object' as const,
    properties: {
      project_name: { type: 'string', description: 'Filter by project name (optional)' },
      status: { type: 'string', enum: ['todo', 'in_progress', 'done'], description: 'Filter by status (optional)' },
    },
    required: [],
  },
}

const UPDATE_TASK_TOOL: Anthropic.Messages.Tool = {
  name: 'update_task',
  description: 'Update an existing task — change its title, status, priority, or project. Use list_tasks first to find the task id.',
  input_schema: {
    type: 'object' as const,
    properties: {
      task_id: { type: 'string', description: 'The task id to update' },
      title: { type: 'string', description: 'New title (optional)' },
      status: { type: 'string', enum: ['todo', 'in_progress', 'done'], description: 'New status (optional)' },
      priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'New priority (optional)' },
      project_name: { type: 'string', description: 'Move to this project by name (optional)' },
    },
    required: ['task_id'],
  },
}

const DELETE_TASK_TOOL: Anthropic.Messages.Tool = {
  name: 'delete_task',
  description: 'Delete a task permanently. Use list_tasks first to find the task id.',
  input_schema: {
    type: 'object' as const,
    properties: {
      task_id: { type: 'string', description: 'The task id to delete' },
    },
    required: ['task_id'],
  },
}

const fn = (t: Anthropic.Messages.Tool) => ({ type: 'function' as const, function: { name: t.name, description: t.description, parameters: t.input_schema } })

const LIST_PROJECTS_FUNCTION = fn(LIST_PROJECTS_TOOL)
const LIST_TASKS_FUNCTION = fn(LIST_TASKS_TOOL)
const UPDATE_TASK_FUNCTION = fn(UPDATE_TASK_TOOL)
const DELETE_TASK_FUNCTION = fn(DELETE_TASK_TOOL)

interface ResolvedConfig {
  provider: AiProvider
  model: string
  apiKey: string
}

export interface ToolCallbacks {
  onToolStart: (id: string, name: string, input: Record<string, unknown>) => void
  onToolDone: (id: string, name: string, result: string) => void
}

export interface Attachment {
  type: 'image' | 'file'
  name: string
  mediaType?: string
  data: string
}

const ALL_TOOLS_ANTHROPIC = [
  WEB_SEARCH_TOOL as Anthropic.Messages.Tool,
  FETCH_PAGE_TOOL as Anthropic.Messages.Tool,
  CREATE_TASK_TOOL,
  LIST_PROJECTS_TOOL,
  LIST_TASKS_TOOL,
  UPDATE_TASK_TOOL,
  DELETE_TASK_TOOL,
]

const ALL_TOOLS_OPENAI = [WEB_SEARCH_FUNCTION, FETCH_PAGE_FUNCTION, CREATE_TASK_FUNCTION, LIST_PROJECTS_FUNCTION, LIST_TASKS_FUNCTION, UPDATE_TASK_FUNCTION, DELETE_TASK_FUNCTION]

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)

  constructor(
    private config: ConfigService,
    private settings: AiSettingsService,
    private knowledge: KnowledgeService,
    private tasks: TasksService,
    private vision: VisionAgent
  ) {}

  async streamMessage(
    userId: string | undefined,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    onChunk: (chunk: string) => void,
    onDone: () => void,
    toolCallbacks?: ToolCallbacks,
    attachments: Attachment[] = []
  ) {
    const cfg = await this.resolveConfig(userId)

    if (!cfg.apiKey) {
      const label = AI_PROVIDERS.find((p) => p.id === cfg.provider)?.label ?? cfg.provider
      onChunk(`⚠︎ ${label} is not configured. Add your API key in Settings → AI Models.`)
      onDone()
      return
    }

    try {
      const userQuery = messages[messages.length - 1]?.content ?? ''

      const images = attachments.filter(a => a.type === 'image')
      const supportsVision = modelSupportsVision(cfg.model)

      // If images are attached but the provider can't handle them at all, bail early
      if (images.length > 0 && !supportsVision && !this.vision.hasVisionFallback()) {
        onChunk(`⚠︎ **${cfg.provider}** doesn't support image inputs. To analyze images, configure an Anthropic or OpenAI key in Settings, or switch to a vision-capable model.`)
        onDone()
        return
      }

      // Vision agent: pre-process images when the chat model doesn't support vision natively
      let visionContext = ''
      if (images.length > 0 && !supportsVision) {
        onChunk('_Analyzing image(s)…_\n\n')
        visionContext = await this.vision.analyze(images, userQuery, cfg)
      }

      // RAG: retrieve relevant knowledge chunks
      const context = userId ? await this.knowledge.retrieve(userId, userQuery) : ''

      // Merge vision analysis + RAG context into messages
      let messagesWithContext = messages
      if (context) messagesWithContext = this.injectContext(messagesWithContext, context)
      if (visionContext) messagesWithContext = this.injectContext(messagesWithContext, visionContext)

      // Strip raw image attachments for non-vision models (already analyzed above)
      const chatAttachments = !supportsVision
        ? attachments.filter(a => a.type !== 'image')
        : attachments

      // Orchestrator: analyze conversation, assess complexity, plan sub-questions
      const analysis = await this.runOrchestrator(cfg, messages)

      const hasNativeReasoning = cfg.model === 'deepseek-reasoner'
      const systemPrompt = this.buildSystemPrompt(analysis, hasNativeReasoning)

      if (cfg.provider === 'anthropic') {
        await this.streamAnthropic(cfg, messagesWithContext, onChunk, toolCallbacks, chatAttachments, systemPrompt, userId)
      } else if (cfg.provider === 'deepseek') {
        await this.streamDeepSeek(cfg, messagesWithContext, onChunk, toolCallbacks, chatAttachments, systemPrompt, userId)
      } else {
        await this.streamOpenAiCompatible(cfg, messagesWithContext, onChunk, toolCallbacks, chatAttachments, systemPrompt, userId)
      }
    } catch (e) {
      const err = e as any
      const msg: string = err?.message ?? String(e)
      const status: number = err?.status ?? err?.statusCode ?? 0

      this.logger.error(`AI stream error (${cfg.provider}/${cfg.model}): ${msg}`)

      if (status === 401 || msg.toLowerCase().includes('invalid api key') || msg.toLowerCase().includes('authentication')) {
        const label = AI_PROVIDERS.find((p) => p.id === cfg.provider)?.label ?? cfg.provider
        onChunk(`⚠︎ Invalid API key for ${label}. Open **Settings → AI Models** and re-enter your key.`)
      } else if (status === 429 || msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('quota')) {
        onChunk(`⚠︎ Rate limit hit. Wait a moment and try again, or switch to a different model in Settings.`)
      } else if (status === 400 || msg.toLowerCase().includes('model') || msg.toLowerCase().includes('invalid request')) {
        onChunk(`⚠︎ Bad request — the selected model may be invalid. Open **Settings → AI Models** and choose a different model.\n\nDetail: ${msg}`)
      } else if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('network')) {
        onChunk(`⚠︎ Cannot reach the AI provider. Check your internet connection and try again.`)
      } else {
        onChunk(`⚠︎ Request failed (${cfg.provider}/${cfg.model}): ${msg}`)
      }
    } finally {
      onDone()
    }
  }

  // ─── Orchestrator agent ────────────────────────────────────────────────────
  // Runs a fast analysis pass before the main response to:
  //   1. Map temporal references to real dates
  //   2. Extract intent from conversation history
  //   3. Assess complexity and generate sub-questions for hard queries
  //   4. Flag whether web search is likely needed

  private async runOrchestrator(
    cfg: ResolvedConfig,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    const now = new Date()
    const dateStr = now.toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    })

    const system = `You are a reasoning orchestrator. Analyze the conversation and produce a structured briefing for a final AI assistant.

Current date and time: ${dateStr}

Respond ONLY in this exact format (keep each line brief):
INTENT: [what the user specifically wants right now, one sentence]
TEMPORAL: [date/time mappings needed, e.g. "today = ${now.toDateString()}", or "none"]
HISTORY: [key prior context the answer depends on, or "none"]
COMPLEXITY: [simple | medium | complex]
SUB_QUESTIONS: [if medium or complex, list 2-4 numbered sub-questions the assistant should answer to respond well; otherwise "none"]
WEB_SEARCH: [yes if the question requires current/real-world data the model likely doesn't know; no otherwise]
NOTES: [ambiguities or special considerations, or "none"]`

    const userContent = messages
      .map(m => `${m.role.toUpperCase()}: ${m.content.slice(0, 600)}`)
      .join('\n\n')

    try {
      if (cfg.provider === 'anthropic') {
        const client = new Anthropic({ apiKey: cfg.apiKey })
        const response = await client.messages.create({
          model: cfg.model,
          max_tokens: 500,
          system,
          messages: [{ role: 'user', content: userContent }],
        })
        return (response.content[0] as Anthropic.TextBlock).text ?? ''
      } else {
        const { host, path } = this.endpointFor(cfg.provider)
        const payload = JSON.stringify({
          model: cfg.model,
          max_tokens: 500,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userContent },
          ],
        })
        const body = await this.httpsPost(host, path, cfg.apiKey, payload)
        const json = JSON.parse(body)
        return json.choices?.[0]?.message?.content ?? ''
      }
    } catch (e) {
      this.logger.warn(`Orchestrator failed, continuing without analysis: ${(e as Error).message}`)
      return ''
    }
  }

  private buildSystemPrompt(orchestratorAnalysis: string, nativeReasoning = false): string {
    const now = new Date()
    const dateStr = now.toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    })

    const webSearchNeeded = orchestratorAnalysis.includes('WEB_SEARCH: yes')
    const isComplex = orchestratorAnalysis.match(/COMPLEXITY:\s*(medium|complex)/i)

    let prompt = `You are Bob, a helpful and precise AI assistant built into a desktop app for dev teams.

Current date and time: ${dateStr}

You have access to these tools:
- web_search: search the internet for current information, news, facts, or anything you are not certain about
- fetch_page: read the full content of any web page URL
- list_projects: list all existing projects in the task manager
- list_tasks: list tasks, optionally filtered by project or status
- create_task: create a task (call list_projects first if a project is involved)
- update_task: update a task's title, status, priority, or project (call list_tasks first to get the id)
- delete_task: delete a task (call list_tasks first to get the id)

Use web_search proactively for any real-world or current data.
For task operations: always fetch the relevant list first (list_projects / list_tasks) before creating, updating, or deleting — never guess ids or project names.`

    if (orchestratorAnalysis) {
      prompt += `\n\n--- Orchestrator briefing ---\n${orchestratorAnalysis}\n--- End briefing ---`
    }

    if (webSearchNeeded) {
      prompt += `\n\nThe orchestrator flagged this question as needing web search. Search before answering.`
    }

    if (isComplex && !nativeReasoning) {
      prompt += `\n\nThis is a complex question. Before giving your final answer, work through it step by step: address each sub-question from the orchestrator briefing above, then synthesize a clear final answer.`
    }

    prompt += `\n\nCore rules:
- Be direct and precise — answer exactly what is asked
- Use the current date above for any time-relative references
- If uncertain, search the web rather than guessing${nativeReasoning ? '' : '\n- For complex questions, reason through sub-questions explicitly before concluding'}`

    return prompt
  }

  // ─── Tool dispatch (shared between providers) ─────────────────────────────

  private async dispatchTool(
    name: string,
    input: Record<string, unknown>,
    id: string,
    toolCallbacks?: ToolCallbacks,
    userId?: string
  ): Promise<string> {
    toolCallbacks?.onToolStart(id, name, input)

    let result = ''
    if (name === 'web_search') {
      const out = await runWebSearch(input.query as string)
      result = formatSearchResults(out)
    } else if (name === 'fetch_page') {
      const out = await runFetchPage(input.url as string)
      result = formatFetchResult(out)
    } else if (name === 'list_projects') {
      if (!userId) {
        result = 'Error: must be logged in'
      } else {
        const projects = await this.tasks.findAllProjects()
        result = projects.length === 0
          ? 'No projects yet.'
          : JSON.stringify(projects.map((p: any) => ({ id: p.id, name: p.name })))
      }
    } else if (name === 'list_tasks') {
      if (!userId) {
        result = 'Error: must be logged in'
      } else {
        let tasks: any[]
        const projectName = input.project_name as string | undefined
        if (projectName) {
          const project = await this.tasks.findProjectByName(projectName)
          tasks = project ? await this.tasks.findByProject(project.id) : []
        } else {
          tasks = await this.tasks.findAll()
        }
        const status = input.status as string | undefined
        if (status) tasks = tasks.filter((t: any) => t.status === status)
        result = tasks.length === 0
          ? 'No tasks found.'
          : JSON.stringify(tasks.map((t: any) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, projectId: t.projectId })))
      }
    } else if (name === 'update_task') {
      if (!userId) {
        result = 'Error: must be logged in'
      } else {
        const patch: Record<string, any> = {}
        if (input.title) patch.title = input.title
        if (input.status) patch.status = input.status
        if (input.priority) patch.priority = input.priority
        if (input.project_name) {
          const project = await this.tasks.findOrCreateProject(input.project_name as string, userId)
          patch.projectId = project.id
        }
        const task = await this.tasks.update(input.task_id as string, patch)
        result = JSON.stringify({ id: task.id, title: task.get('title'), status: task.get('status') })
      }
    } else if (name === 'delete_task') {
      if (!userId) {
        result = 'Error: must be logged in'
      } else {
        await this.tasks.remove(input.task_id as string)
        result = 'Task deleted.'
      }
    } else if (name === 'create_task') {
      if (!userId) {
        result = 'Error: must be logged in to create tasks'
      } else {
        let projectId: string | undefined
        const projectName = input.project_name as string | undefined
        if (projectName) {
          const project = await this.tasks.findOrCreateProject(projectName, userId)
          projectId = project.id
        }
        const task = await this.tasks.create({
          title: input.title as string,
          description: input.description as string | undefined,
          priority: input.priority as string | undefined,
          projectId,
          createdById: userId,
        })
        result = JSON.stringify({ id: task.id, title: task.get('title'), status: task.get('status'), projectId })
      }
    } else {
      result = `Unknown tool: ${name}`
    }

    toolCallbacks?.onToolDone(id, name, result)
    return result
  }

  // ─── Anthropic ────────────────────────────────────────────────────────────

  private async streamAnthropic(
    cfg: ResolvedConfig,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    onChunk: (c: string) => void,
    toolCallbacks?: ToolCallbacks,
    attachments: Attachment[] = [],
    systemPrompt?: string,
    userId?: string
  ) {
    const hasPdf = attachments.some(a => a.mediaType === 'application/pdf')
    const client = new Anthropic({
      apiKey: cfg.apiKey,
      defaultHeaders: hasPdf ? { 'anthropic-beta': 'pdfs-2024-09-25' } : undefined,
    })

    const history: Anthropic.MessageParam[] = messages.map((m, i) => {
      const isLast = i === messages.length - 1
      if (isLast && m.role === 'user' && attachments.length > 0) {
        const blocks: any[] = []
        for (const att of attachments) {
          if (att.type === 'image') {
            blocks.push({
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: (att.mediaType ?? 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: att.data,
              },
            })
          } else if (att.mediaType === 'application/pdf') {
            blocks.push({
              type: 'document' as const,
              source: {
                type: 'base64' as const,
                media_type: 'application/pdf' as const,
                data: att.data,
              },
              title: att.name,
            } as any)
          } else {
            blocks.push({ type: 'text' as const, text: `\`\`\`${att.name}\n${att.data}\n\`\`\`` })
          }
        }
        blocks.push({ type: 'text', text: m.content })
        return { role: 'user' as const, content: blocks }
      }
      return { role: m.role as 'user' | 'assistant', content: m.content }
    })

    // Determine if extended thinking is supported (claude-3-5+ and claude-4+)
    const thinkingSupported = /claude-(3-5|3\.5|4)/.test(cfg.model)

    while (true) {
      const createParams: Anthropic.MessageCreateParamsNonStreaming = {
        model: cfg.model,
        max_tokens: thinkingSupported ? 16000 : 4096,
        system: systemPrompt,
        tools: ALL_TOOLS_ANTHROPIC,
        messages: history,
      }

      // Enable extended thinking so the model can reason through complex questions
      if (thinkingSupported) {
        ;(createParams as any).thinking = { type: 'enabled', budget_tokens: 8000 }
      }

      const response = await client.messages.create(createParams)

      if (response.stop_reason === 'tool_use') {
        for (const block of response.content) {
          if (block.type === 'text' && block.text) onChunk(block.text)
        }

        const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []
        for (const block of response.content) {
          if (block.type !== 'tool_use') continue
          const result = await this.dispatchTool(
            block.name,
            block.input as Record<string, unknown>,
            block.id,
            toolCallbacks,
            userId
          )
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
        }

        history.push({ role: 'assistant', content: response.content })
        history.push({ role: 'user', content: toolResults })
        continue
      }

      // Final answer — stream it
      const streamParams: any = {
        model: cfg.model,
        max_tokens: thinkingSupported ? 16000 : 4096,
        system: systemPrompt,
        tools: ALL_TOOLS_ANTHROPIC,
        messages: history,
      }
      if (thinkingSupported) {
        streamParams.thinking = { type: 'enabled', budget_tokens: 8000 }
      }

      const stream = client.messages.stream(streamParams)
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          onChunk(chunk.delta.text)
        }
      }
      break
    }
  }

  // ─── DeepSeek ─────────────────────────────────────────────────────────────
  // DeepSeek uses the OpenAI-compatible chat/completions API but needs its own
  // endpoint and has special handling for deepseek-reasoner (native CoT).

  private async streamDeepSeek(
    cfg: ResolvedConfig,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    onChunk: (c: string) => void,
    toolCallbacks?: ToolCallbacks,
    attachments: Attachment[] = [],
    systemPrompt?: string,
    userId?: string
  ) {
    const baseUrl = this.config.get('DEEPSEEK_BASE_URL', 'https://api.deepseek.com')
    const parsed = new URL(baseUrl)
    const host = parsed.host
    const basePath = parsed.pathname.replace(/\/$/, '')

    const isReasoner = cfg.model === 'deepseek-reasoner'

    const history: Array<{ role: string; content: unknown; tool_call_id?: string; name?: string }> = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages.map((m, i) => {
        const isLast = i === messages.length - 1
        if (isLast && m.role === 'user' && attachments.length > 0) {
          const parts: unknown[] = []
          for (const att of attachments) {
            if (att.type === 'image') {
              if (isReasoner) {
                parts.push({ type: 'text', text: `[Image attached: ${att.name}]\nNote: deepseek-reasoner does not support image inputs. Switch to deepseek-chat to send images.` })
              } else {
                parts.push({ type: 'image_url', image_url: { url: `data:${att.mediaType ?? 'image/jpeg'};base64,${att.data}` } })
              }
            } else if (att.mediaType === 'application/pdf') {
              parts.push({ type: 'text', text: `[PDF attached: ${att.name}]\nNote: PDF content cannot be displayed inline for this provider. Please describe what you'd like help with regarding this PDF.` })
            } else {
              parts.push({ type: 'text', text: `\`\`\`${att.name}\n${att.data}\n\`\`\`` })
            }
          }
          parts.push({ type: 'text', text: m.content })
          return { role: m.role, content: parts }
        }
        return { role: m.role, content: m.content }
      }),
    ]

    // deepseek-reasoner doesn't support function calling — stream directly.
    // deepseek-chat supports tools just like OpenAI.
    if (isReasoner) {
      const payload = JSON.stringify({ model: cfg.model, stream: true, messages: history })
      await this.streamSse(host, `${basePath}/chat/completions`, cfg.apiKey, payload, onChunk)
      return
    }

    // deepseek-chat: full tool-call loop
    while (true) {
      const payload = JSON.stringify({
        model: cfg.model,
        stream: false,
        tools: ALL_TOOLS_OPENAI,
        tool_choice: 'auto',
        messages: history,
      })

      const responseBody = await this.httpsPost(host, `${basePath}/chat/completions`, cfg.apiKey, payload)
      const json = JSON.parse(responseBody)
      const choice = json.choices?.[0]
      const msg = choice?.message

      if (choice?.finish_reason === 'tool_calls' && msg?.tool_calls?.length) {
        history.push({ role: 'assistant', content: msg.content ?? '', ...msg })
        for (const tc of msg.tool_calls) {
          const fnName = tc.function?.name
          const fnArgs = JSON.parse(tc.function?.arguments ?? '{}')
          const result = await this.dispatchTool(fnName, fnArgs, tc.id, toolCallbacks, userId)
          history.push({ role: 'tool', tool_call_id: tc.id, name: fnName, content: result })
        }
        continue
      }

      const streamPayload = JSON.stringify({ model: cfg.model, stream: true, messages: history })
      await this.streamSse(host, `${basePath}/chat/completions`, cfg.apiKey, streamPayload, onChunk)
      break
    }
  }

  // ─── OpenAI-compatible providers ──────────────────────────────────────────

  private async streamOpenAiCompatible(
    cfg: ResolvedConfig,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    onChunk: (c: string) => void,
    toolCallbacks?: ToolCallbacks,
    attachments: Attachment[] = [],
    systemPrompt?: string,
    userId?: string
  ) {
    const { host, path } = this.endpointFor(cfg.provider)

    const history: Array<{ role: string; content: unknown; tool_call_id?: string; name?: string }> = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages.map((m, i) => {
        const isLast = i === messages.length - 1
        if (isLast && m.role === 'user' && attachments.length > 0) {
          const parts: unknown[] = []
          for (const att of attachments) {
            if (att.type === 'image') {
              parts.push({ type: 'image_url', image_url: { url: `data:${att.mediaType ?? 'image/jpeg'};base64,${att.data}` } })
            } else if (att.mediaType === 'application/pdf') {
              parts.push({ type: 'text', text: `[PDF attached: ${att.name}]\nNote: PDF content cannot be displayed inline for this provider. Please describe what you'd like help with regarding this PDF.` })
            } else {
              parts.push({ type: 'text', text: `\`\`\`${att.name}\n${att.data}\n\`\`\`` })
            }
          }
          parts.push({ type: 'text', text: m.content })
          return { role: m.role, content: parts }
        }
        return { role: m.role, content: m.content }
      }),
    ]

    while (true) {
      const payload = JSON.stringify({
        model: cfg.model,
        stream: false,
        tools: ALL_TOOLS_OPENAI,
        tool_choice: 'auto',
        messages: history,
      })

      const responseBody = await this.httpsPost(host, path, cfg.apiKey, payload)
      const json = JSON.parse(responseBody)
      const choice = json.choices?.[0]
      const msg = choice?.message

      if (choice?.finish_reason === 'tool_calls' && msg?.tool_calls?.length) {
        history.push({ role: 'assistant', content: msg.content ?? '', ...msg })

        for (const tc of msg.tool_calls) {
          const fnName = tc.function?.name
          const fnArgs = JSON.parse(tc.function?.arguments ?? '{}')
          const result = await this.dispatchTool(fnName, fnArgs, tc.id, toolCallbacks, userId)
          history.push({ role: 'tool', tool_call_id: tc.id, name: fnName, content: result })
        }
        continue
      }

      // Final answer — stream it
      const streamPayload = JSON.stringify({ model: cfg.model, stream: true, messages: history })
      await this.streamSse(host, path, cfg.apiKey, streamPayload, onChunk)
      break
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private injectContext(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    context: string
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    if (!messages.length) return messages
    const block = `<knowledge_base>\nThe following excerpts from the user's knowledge base may be relevant:\n\n${context}\n</knowledge_base>\n\n`
    const last = messages[messages.length - 1]
    return [...messages.slice(0, -1), { ...last, content: block + last.content }]
  }

  private async resolveConfig(userId: string | undefined): Promise<ResolvedConfig> {
    let provider: AiProvider = DEFAULT_AI_PROVIDER
    let model = AI_PROVIDERS.find((p) => p.id === provider)!.defaultModel
    let apiKey = ''

    if (userId) {
      const row = await this.settings.getRaw(userId)
      if (row) {
        provider = row.provider as AiProvider
        model = row.model || model
        apiKey = row.apiKey ?? ''
      }
    }

    if (!apiKey) apiKey = this.envKeyFor(provider)
    return { provider, model, apiKey }
  }

  private envKeyFor(provider: AiProvider): string {
    switch (provider) {
      case 'openai':    return this.config.get('OPENAI_API_KEY', '')
      case 'anthropic': return this.config.get('ANTHROPIC_API_KEY', '')
      case 'deepseek':
      default:          return this.config.get('DEEPSEEK_API_KEY', '')
    }
  }

  private endpointFor(provider: AiProvider): { host: string; path: string } {
    // Only OpenAI reaches this — DeepSeek has its own streamDeepSeek method.
    const url = new URL(this.config.get('OPENAI_BASE_URL', 'https://api.openai.com'))
    return { host: url.host, path: `${url.pathname.replace(/\/$/, '')}/v1/chat/completions` }
  }

  private httpsPost(host: string, path: string, apiKey: string, payload: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          host, path, method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        res => {
          let body = ''
          res.on('data', c => (body += c))
          res.on('end', () => {
            if ((res.statusCode ?? 500) >= 400) return reject(new Error(`${res.statusCode}: ${body}`))
            resolve(body)
          })
        }
      )
      req.on('error', reject)
      req.write(payload)
      req.end()
    })
  }

  private streamSse(
    host: string,
    path: string,
    apiKey: string,
    payload: string,
    onChunk: (c: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          host, path, method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        res => {
          if ((res.statusCode ?? 500) >= 400) {
            let err = ''
            res.on('data', c => (err += c))
            res.on('end', () => reject(new Error(`${res.statusCode}: ${err}`)))
            return
          }
          let buffer = ''
          res.on('data', chunk => {
            buffer += chunk.toString()
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''
            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed.startsWith('data:')) continue
              const data = trimmed.slice(5).trim()
              if (!data || data === '[DONE]') continue
              try {
                const j = JSON.parse(data)
                const delta: string | undefined = j.choices?.[0]?.delta?.content
                if (delta) onChunk(delta)
              } catch { /* partial frame */ }
            }
          })
          res.on('end', () => resolve())
        }
      )
      req.on('error', reject)
      req.write(payload)
      req.end()
    })
  }
}
