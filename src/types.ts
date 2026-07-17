export type Harness = 'claude' | 'opencode' | 'codex';
export type Provider = 'anthropic' | 'opencode-zen' | 'opencode-go' | 'amazon-bedrock' | 'openai';
export type OpenCodeProvider = 'opencode-zen' | 'opencode-go' | 'amazon-bedrock';

export const HARNESS_CHOICES: Harness[] = ['claude', 'opencode', 'codex'];

export const AGENT_NAMES = ['recon', 'oracle', 'architect'] as const;
export type AgentName = typeof AGENT_NAMES[number];

export interface AgentConfig {
  template: AgentName;
  name: AgentName;
  model: string;
}

export interface ClaudeConfig {
  default_model: string;
  agents: AgentConfig[];
}

export interface CodexConfig {
  default_model: string;
  agents: AgentConfig[];
}

export interface OpenCodeConfig {
  provider: OpenCodeProvider;
  build_model: string;
  plan_model: string;
  agents: AgentConfig[];
}

export type HarnessSection = ClaudeConfig | CodexConfig | OpenCodeConfig;

export type AtelierConfig = {
  version: string;
  skills_source: string;
  skills_path: string;
} & Partial<Record<Harness, HarnessSection>>;

export type SharedConfig = Pick<AtelierConfig, 'version' | 'skills_source' | 'skills_path'>;

export interface FileEntry {
  path: string;
  exists: boolean;
}
