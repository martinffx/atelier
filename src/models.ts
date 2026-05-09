export const claudModels = ['haiku', 'sonnet', 'opus'] as const;

export const opencodeModels = [
  'opencode-go/qwen3.6-plus',
  'opencode-go/minimax-m2.7',
  'opencode-go/kimi-k2.6',
  'opencode-go/glm-5.1',
  'opencode-go/deepseek-v4-pro',
  'opencode-go/deepseek-v4-flash',
  'opencode/claude-haiku-4-5',
  'opencode/claude-sonnet-4-6',
  'opencode/claude-opus-4-7',
  'opencode/gpt-5.3-codex-spark',
  'opencode/gpt-5.3-codex',
  'opencode/gpt-5.5',
  'opencode/gpt-5.4',
] as const;

export const defaultModels = {
  claude: {
    scout: 'haiku',
    oracle: 'opus',
    architect: 'opus',
  },
  opencode: {
    scout: 'opencode/deepseek-v4-flash',
    oracle: 'opencode-go/kimi-k2.6',
    architect: 'opencode-go/deepseek-v4-pro',
  },
} as const;

export type ModelName = (typeof claudModels)[number] | (typeof opencodeModels)[number];