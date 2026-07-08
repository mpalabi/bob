import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import * as https from 'https'
import type { Attachment } from '../ai.service'

export function modelSupportsVision(model: string): boolean {
  // DeepSeek's hosted API does not support image inputs for any model
  if (model.startsWith('deepseek')) return false
  // Anthropic claude-3+ and claude-4+ all support vision
  if (/claude-(3|4|3-5|3\.5)/.test(model)) return true
  // OpenAI vision-capable models
  if (/gpt-4o|gpt-4-turbo|gpt-4-vision/.test(model)) return true
  return false
}

interface VisionConfig {
  provider: 'anthropic' | 'deepseek' | 'openai' | string
  model: string
  apiKey: string
  baseUrl?: string
}

@Injectable()
export class VisionAgent {
  private readonly logger = new Logger(VisionAgent.name)

  constructor(private config: ConfigService) {}

  hasVisionFallback(): boolean {
    return !!(
      this.config.get<string>('ANTHROPIC_API_KEY') ||
      this.config.get<string>('OPENAI_API_KEY')
    )
  }

  /**
   * Analyze images using a vision-capable model.
   * Returns a text description injected as context for the chat agent.
   */
  async analyze(
    images: Attachment[],
    question: string,
    userConfig: { provider: string; model: string; apiKey: string }
  ): Promise<string> {
    if (images.length === 0) return ''

    // Prefer the user's own provider if it supports vision
    const visionCfg = this.resolveVisionConfig(userConfig)

    if (!visionCfg) {
      return images
        .map(img => `[Image: ${img.name} — no vision-capable model is configured. Add an Anthropic or OpenAI key in Settings to enable image analysis.]`)
        .join('\n')
    }

    try {
      this.logger.log(`Vision agent: analyzing ${images.length} image(s) with ${visionCfg.provider}/${visionCfg.model}`)
      const description = await this.runVision(visionCfg, images, question)
      return `--- Vision Agent Analysis ---\n${description}\n--- End Vision Analysis ---`
    } catch (e) {
      this.logger.warn(`Vision agent failed: ${(e as Error).message}`)
      return images.map(img => `[Image: ${img.name} — analysis failed: ${(e as Error).message}]`).join('\n')
    }
  }

  private resolveVisionConfig(userConfig: { provider: string; model: string; apiKey: string }): VisionConfig | null {
    // Use user's own model if it supports vision
    if (userConfig.apiKey && modelSupportsVision(userConfig.model)) {
      return { provider: userConfig.provider, model: userConfig.model, apiKey: userConfig.apiKey }
    }

    // Fall back to Anthropic claude-3-haiku via server env key
    const anthropicKey = this.config.get<string>('ANTHROPIC_API_KEY')
    if (anthropicKey) {
      return { provider: 'anthropic', model: 'claude-3-haiku-20240307', apiKey: anthropicKey }
    }

    // Fall back to OpenAI gpt-4o-mini via server env key
    const openaiKey = this.config.get<string>('OPENAI_API_KEY')
    if (openaiKey) {
      return { provider: 'openai', model: 'gpt-4o-mini', apiKey: openaiKey }
    }

    return null
  }

  private async runVision(cfg: VisionConfig, images: Attachment[], question: string): Promise<string> {
    const prompt = `You are a vision analysis agent. Analyze the attached image(s) and provide a detailed, structured description that will help a chat assistant answer the user's question.

User's question or context: "${question || 'Please describe what you see.'}"

For each image, describe:
- What is shown (objects, people, scenes, UI, code, diagrams, etc.)
- Key details relevant to the user's question
- Any text visible in the image (transcribe it accurately)
- Colors, layout, structure if relevant

Be thorough but concise. The chat assistant will use your analysis to respond.`

    if (cfg.provider === 'anthropic') {
      return this.runAnthropicVision(cfg, images, prompt)
    } else {
      return this.runOpenAiVision(cfg, images, prompt)
    }
  }

  private async runAnthropicVision(cfg: VisionConfig, images: Attachment[], prompt: string): Promise<string> {
    const client = new Anthropic({ apiKey: cfg.apiKey })

    const imageBlocks: Anthropic.ImageBlockParam[] = images.map(img => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: (img.mediaType ?? 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
        data: img.data,
      },
    }))

    const response = await client.messages.create({
      model: cfg.model,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [...imageBlocks, { type: 'text', text: prompt }],
      }],
    })

    return (response.content[0] as Anthropic.TextBlock).text ?? ''
  }

  private async runOpenAiVision(cfg: VisionConfig, images: Attachment[], prompt: string): Promise<string> {
    const baseUrl = cfg.baseUrl ?? (cfg.provider === 'deepseek' ? 'https://api.deepseek.com' : 'https://api.openai.com')
    const parsed = new URL(baseUrl)
    const host = parsed.host
    const basePath = parsed.pathname.replace(/\/$/, '')

    const imageParts = images.map(img => ({
      type: 'image_url',
      image_url: { url: `data:${img.mediaType ?? 'image/jpeg'};base64,${img.data}` },
    }))

    const payload = JSON.stringify({
      model: cfg.model,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [...imageParts, { type: 'text', text: prompt }],
      }],
    })

    const body = await this.httpsPost(host, `${basePath}/chat/completions`, cfg.apiKey, payload)
    const json = JSON.parse(body)
    return json.choices?.[0]?.message?.content ?? ''
  }

  private httpsPost(host: string, path: string, apiKey: string, payload: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        { hostname: host, path, method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, 'Content-Length': Buffer.byteLength(payload) } },
        res => {
          let data = ''
          res.on('data', c => (data += c))
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 400) reject(new Error(`${res.statusCode}: ${data}`))
            else resolve(data)
          })
        }
      )
      req.on('error', reject)
      req.write(payload)
      req.end()
    })
  }
}
