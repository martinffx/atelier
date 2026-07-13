export type Provider = 'anthropic' | 'opencode-zen' | 'opencode-go' | 'amazon-bedrock';

export const providers: Record<string, readonly Provider[]> = {
  claude: ['anthropic'],
  opencode: ['opencode-zen', 'opencode-go', 'amazon-bedrock'],
} as const;

export const providerModels: Record<Provider, readonly string[]> = {
  anthropic: ['haiku', 'sonnet', 'opus', 'opusplan'],
  'opencode-zen': [
    'opencode/gpt-5.5',
    'opencode/gpt-5.4',
    'opencode/gpt-5.3-codex',
    'opencode/gpt-5.3-codex-spark',
    'opencode/gpt-5.2',
    'opencode/gpt-5.1',
    'opencode/gpt-5',
    'opencode/claude-opus-4-7',
    'opencode/claude-opus-4-6',
    'opencode/claude-sonnet-4-6',
    'opencode/claude-sonnet-4-5',
    'opencode/claude-haiku-4-5',
    'opencode/deepseek-v4-pro',
    'opencode/deepseek-v4-flash',
    'opencode/qwen3.6-plus',
    'opencode/minimax-m3',
    'opencode/kimi-k2.7-code',
    'opencode/glm-5.2',
    'opencode/gemini-3.1-pro',
    'opencode/gemini-3-flash',
  ],
  'opencode-go': [
    'opencode-go/deepseek-v4-pro',
    'opencode-go/deepseek-v4-flash',
    'opencode-go/kimi-k2.7-code',
    'opencode-go/glm-5.2',
    'opencode-go/qwen3.6-plus',
    'opencode-go/minimax-m3',
    'opencode-go/mimo-v2.5',
    'opencode-go/mimo-v2.5-pro',
  ],
  'amazon-bedrock': [
    'amazon-bedrock/anthropic-claude-sonnet-4-5',
    'amazon-bedrock/anthropic-claude-haiku-4-5',
    'amazon-bedrock/anthropic-claude-opus-4-7',
  ],
} as const;

export const defaultModels: Record<Provider, Record<string, string>> = {
  anthropic: {
    recon: 'haiku',
    oracle: 'opus',
    architect: 'opus',
  },
  'opencode-zen': {
    recon: 'opencode/deepseek-v4-flash',
    oracle: 'opencode/kimi-k2.7-code',
    architect: 'opencode/deepseek-v4-pro',
    build: 'opencode/deepseek-v4-flash',
    plan: 'opencode/deepseek-v4-pro',
  },
  'opencode-go': {
    recon: 'opencode-go/deepseek-v4-flash',
    oracle: 'opencode-go/kimi-k2.7-code',
    architect: 'opencode-go/deepseek-v4-pro',
    build: 'opencode-go/deepseek-v4-flash',
    plan: 'opencode-go/deepseek-v4-pro',
  },
  'amazon-bedrock': {
    recon: 'amazon-bedrock/anthropic-claude-haiku-4-5',
    oracle: 'amazon-bedrock/anthropic-claude-opus-4-7',
    architect: 'amazon-bedrock/anthropic-claude-opus-4-7',
    build: 'amazon-bedrock/anthropic-claude-sonnet-4-5',
    plan: 'amazon-bedrock/anthropic-claude-haiku-4-5',
  },
} as const;

// Backward compatibility exports
export const claudModels = providerModels.anthropic;
export const opencodeModels = [
  ...providerModels['opencode-zen'],
  ...providerModels['opencode-go'],
  ...providerModels['amazon-bedrock'],
] as const;

export type ModelName =
  | (typeof providerModels.anthropic)[number]
  | (typeof providerModels['opencode-zen'])[number]
  | (typeof providerModels['opencode-go'])[number]
  | (typeof providerModels['amazon-bedrock'])[number];
