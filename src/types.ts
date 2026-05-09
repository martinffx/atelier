export type Harness = 'claude' | 'opencode';

export interface AgentConfig {
  template: string;
  name: string;
  model: string;
}

export interface AtelierConfig {
  version: string;
  harness: Harness;
  skills_source: string;
  skills_path: string;
  agents: AgentConfig[];
}

export interface ModelRegistry {
  [key: string]: string[];
}
