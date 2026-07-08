import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as https from 'https'

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name)
  readonly dims = 1536 // text-embedding-3-small

  constructor(private config: ConfigService) {}

  private get apiKey(): string {
    return this.config.get('OPENAI_API_KEY', '')
  }

  get canEmbed(): boolean {
    return Boolean(this.apiKey)
  }

  async embed(text: string): Promise<number[] | null> {
    if (!this.apiKey) return null
    try {
      const body = JSON.stringify({ input: text.slice(0, 8000), model: 'text-embedding-3-small' })
      const json = await this.post(body)
      return json.data?.[0]?.embedding ?? null
    } catch (e) {
      this.logger.warn('Embedding failed:', (e as Error).message)
      return null
    }
  }

  async embedBatch(texts: string[]): Promise<(number[] | null)[]> {
    if (!this.apiKey) return texts.map(() => null)
    try {
      const body = JSON.stringify({
        input: texts.map(t => t.slice(0, 8000)),
        model: 'text-embedding-3-small'
      })
      const json = await this.post(body)
      const sorted = (json.data as Array<{ index: number; embedding: number[] }>)
        .sort((a, b) => a.index - b.index)
      return sorted.map(d => d.embedding)
    } catch (e) {
      this.logger.warn('Batch embedding failed:', (e as Error).message)
      return texts.map(() => null)
    }
  }

  private post(payload: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = https.request({
        host: 'api.openai.com',
        path: '/v1/embeddings',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(payload)
        }
      }, res => {
        let body = ''
        res.on('data', c => body += c)
        res.on('end', () => {
          if ((res.statusCode ?? 500) >= 400) return reject(new Error(`${res.statusCode}: ${body}`))
          resolve(JSON.parse(body))
        })
      })
      req.on('error', reject)
      req.write(payload)
      req.end()
    })
  }
}
