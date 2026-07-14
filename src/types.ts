export type Harness = 'claude' | 'opencode' | 'codex';
export type Provider = 'anthropic' | 'opencode-zen' | 'opencode-go' | 'amazon-bedrock' | 'openai';

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
  provider: Provider;
  build_model: string;
  plan_model: string;
  agents: AgentConfig[];
}

export interface AtelierConfig {
  version: string;
  skills_source: string;
  skills_path: string;
  claude?: ClaudeConfig;
  codex?: CodexConfig;
  opencode?: OpenCodeConfig;
}
