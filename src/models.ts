import type { Provider, OpenCodeProvider, AgentName } from './types.js';

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
  openai: [
    'gpt-5.6-sol',
    'gpt-5.6-terra',
    'gpt-5.6-luna',
    'gpt-5.5',
    'gpt-5.4',
    'gpt-5.4-mini',
    'gpt-5.4-nano',
    'gpt-5.3-codex-spark',
  ],
} as const;

export type SimpleDefaultModels = Record<AgentName, string> & { default_model?: string };
export type OpenCodeDefaultModels = Record<AgentName, string> & { build: string; plan: string };

export const defaultModels: {
  anthropic: SimpleDefaultModels & { default_model: string };
  openai: SimpleDefaultModels & { default_model: string };
} & Record<OpenCodeProvider, OpenCodeDefaultModels> = {
  anthropic: {
    default_model: 'opusplan',
    recon: 'haiku',
    oracle: 'opus',
    architect: 'opus',
  },
  'opencode-zen': {
    recon: 'opencode/minimax-m2.7',
    oracle: 'opencode/kimi-k2.6',
    architect: 'opencode/deepseek-v4-pro',
    build: 'opencode/deepseek-v4-flash',
    plan: 'opencode/deepseek-v4-pro',
  },
  'opencode-go': {
    recon: 'opencode-go/minimax-m2.7',
    oracle: 'opencode-go/kimi-k2.6',
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
  openai: {
    recon: 'gpt-5.6-luna',
    oracle: 'gpt-5.6-sol',
    architect: 'gpt-5.6-sol',
    default_model: 'gpt-5.6-terra',
  },
} as const;
