import type { z } from 'zod';

export const HARNESS_NAMES = ['claude', 'opencode', 'codex'] as const;
export type Harness = typeof HARNESS_NAMES[number];

// Backwards-compatible alias for code that still uses HARNESS_CHOICES.
export const HARNESS_CHOICES: Harness[] = [...HARNESS_NAMES];

export type Provider = 'anthropic' | 'opencode-zen' | 'opencode-go' | 'amazon-bedrock' | 'openai';
export type OpenCodeProvider = 'opencode-zen' | 'opencode-go' | 'amazon-bedrock';

export interface ProviderChoice {
  name: string;
  value: Provider;
}

export const AGENT_NAMES = ['recon', 'oracle', 'architect'] as const;
export type AgentName = typeof AGENT_NAMES[number];

export interface AgentConfig {
  template: AgentName;
  name: AgentName;
  model: string;
}

export interface SimpleConfig {
  provider?: string;
  default_model: string;
  agents: AgentConfig[];
}

// Claude and Codex share the same simple config shape; the harness key provides the meaning.
export type ClaudeConfig = SimpleConfig;
export type CodexConfig = SimpleConfig;

export interface OpenCodeConfig {
  provider: OpenCodeProvider;
  build_model: string;
  plan_model: string;
  agents: AgentConfig[];
}

export type HarnessSection = SimpleConfig | OpenCodeConfig;

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

export interface HarnessAdapter {
  name: Harness;
  providerChoices?: ProviderChoice[];
  configSchema: z.ZodSchema;
  defaultSection(provider?: Provider): HarnessSection;
  modelsForProvider(provider?: Provider): readonly string[];
  installAgents(shared: SharedConfig, section: HarnessSection, basePath: string): void;
  mergeHarnessConfig(shared: SharedConfig, section: HarnessSection, basePath: string): void;
  fileList(basePath: string): FileEntry[];
  remove(shared: SharedConfig, section: HarnessSection, basePath: string): void;
}
