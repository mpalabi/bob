export type AiProvider = 'deepseek' | 'openai' | 'anthropic';

/** Per-user AI configuration as returned to the client (never includes the key). */
export interface AiSettings {
  provider: AiProvider;
  model: string;
  hasApiKey: boolean;
}

/** Payload to update AI settings. apiKey is optional — omit to keep the existing one. */
export interface AiSettingsInput {
  provider: AiProvider;
  model: string;
  apiKey?: string;
}

export interface AiProviderInfo {
  id: AiProvider;
  label: string;
  models: string[];
  defaultModel: string;
  /** Where to get a key + the expected key prefix, shown as a hint in the UI. */
  keyHint: string;
}

// Catalog used to populate the settings UI. Model lists are suggestions —
// the UI also allows typing any model id the provider supports.
export const AI_PROVIDERS: AiProviderInfo[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
    keyHint: 'platform.deepseek.com — key starts with "sk-"'
  },
  {
    id: 'openai',
    label: 'OpenAI',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'gpt-4.1-mini'],
    defaultModel: 'gpt-4o-mini',
    keyHint: 'platform.openai.com — key starts with "sk-"'
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    models: ['claude-sonnet-4-6', 'claude-opus-4-8', 'claude-haiku-4-5-20251001'],
    defaultModel: 'claude-sonnet-4-6',
    keyHint: 'console.anthropic.com — key starts with "sk-ant-"'
  }
];

export const DEFAULT_AI_PROVIDER: AiProvider = 'deepseek';
