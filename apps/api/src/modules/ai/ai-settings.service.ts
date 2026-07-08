import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import type { AiProvider, AiSettings, AiSettingsInput } from '@bob/shared'
import { DEFAULT_AI_PROVIDER, AI_PROVIDERS } from '@bob/shared'
import { AiSetting } from './entities/ai-setting.model'

function defaultModel(provider: AiProvider): string {
  return AI_PROVIDERS.find((p) => p.id === provider)?.defaultModel ?? 'deepseek-chat'
}

@Injectable()
export class AiSettingsService {
  constructor(@InjectModel(AiSetting) private model: typeof AiSetting) {}

  /** Raw row (includes the key) — for internal use by AiService only. */
  async getRaw(userId: string): Promise<AiSetting | null> {
    return this.model.findByPk(userId)
  }

  /** Client-safe view: provider/model + whether a key is on file (never the key). */
  async get(userId: string): Promise<AiSettings> {
    const row = await this.getRaw(userId)
    const provider = (row?.provider as AiProvider) ?? DEFAULT_AI_PROVIDER
    return {
      provider,
      model: row?.model ?? defaultModel(provider),
      hasApiKey: Boolean(row?.apiKey)
    }
  }

  async upsert(userId: string, input: AiSettingsInput): Promise<AiSettings> {
    const existing = await this.getRaw(userId)
    const model = input.model || defaultModel(input.provider)

    if (existing) {
      existing.provider = input.provider
      existing.model = model
      // Only overwrite the key when a non-empty one is supplied.
      if (input.apiKey) existing.apiKey = input.apiKey
      await existing.save()
    } else {
      await this.model.create({
        userId,
        provider: input.provider,
        model,
        apiKey: input.apiKey ?? null
      } as any)
    }

    return this.get(userId)
  }
}
