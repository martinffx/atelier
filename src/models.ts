export type Provider = 'anthropic' | 'opencode-zen' | 'opencode-go' | 'amazon-bedrock';

export const providers: Record<string, readonly Provider[]> = {
  claude: ['anthropic'],
  opencode: ['opencode-zen', 'opencode-go', 'amazon-bedrock'],
} as const;

export const providerModels: Record<Provider, readonly string[]> = {
  anthropic: ['haiku', 'sonnet', 'opus'],
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
    'opencode/qwen3.6-plus',
    'opencode/minimax-m2.7',
    'opencode/kimi-k2.6',
    'opencode/glm-5.1',
    'opencode/gemini-3.1-pro',
    'opencode/gemini-3-flash',
  ],
  'opencode-go': [
    'opencode-go/glm-5.1',
    'opencode-go/glm-5',
    'opencode-go/kimi-k2.5',
    'opencode-go/kimi-k2.6',
    'opencode-go/deepseek-v4-pro',
    'opencode-go/deepseek-v4-flash',
    'opencode-go/minimax-m2.7',
    'opencode-go/minimax-m2.5',
    'opencode-go/qwen3.5-plus',
    'opencode-go/qwen3.6-plus',
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
    scout: 'haiku',
    oracle: 'opus',
    architect: 'opus',
  },
  'opencode-zen': {
    scout: 'opencode/deepseek-v4-flash',
    oracle: 'opencode/kimi-k2.6',
    architect: 'opencode/deepseek-v4-pro',
  },
  'opencode-go': {
    scout: 'opencode-go/deepseek-v4-flash',
    oracle: 'opencode-go/kimi-k2.6',
    architect: 'opencode-go/deepseek-v4-pro',
  },
  'amazon-bedrock': {
    scout: 'amazon-bedrock/anthropic-claude-haiku-4-5',
    oracle: 'amazon-bedrock/anthropic-claude-opus-4-7',
    architect: 'amazon-bedrock/anthropic-claude-opus-4-7',
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
