export type Harness = 'claude' | 'opencode';
export type Provider = 'anthropic' | 'opencode-zen' | 'opencode-go' | 'amazon-bedrock';

export interface AgentConfig {
  template: string;
  name: string;
  model: string;
}

export interface AtelierConfig {
  version: string;
  harness: Harness;
  provider?: Provider;
  skills_source: string;
  skills_path: string;
  agents: AgentConfig[];
  build_model?: string;
  plan_model?: string;
  default_model?: string;
}

export interface ModelRegistry {
  [key: string]: string[];
}
