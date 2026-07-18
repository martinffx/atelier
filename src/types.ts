import type { z } from 'zod';
import type inquirer from 'inquirer';
import { AGENT_NAMES, HARNESS_NAMES } from './constants.js';
import { AgentSchema, SimpleConfigSchema, OpenCodeConfigSchema } from './utils/schemas.js';

export type Harness = typeof HARNESS_NAMES[number];
export type AgentName = typeof AGENT_NAMES[number];

export type Provider = 'anthropic' | 'opencode-zen' | 'opencode-go' | 'amazon-bedrock' | 'openai';
export type OpenCodeProvider = 'opencode-zen' | 'opencode-go' | 'amazon-bedrock' | 'openai';

export interface ProviderChoice {
  name: string;
  value: Provider;
}

export type AgentConfig = z.infer<typeof AgentSchema>;
export type SimpleConfig = z.infer<typeof SimpleConfigSchema>;

// Claude and Codex share the same simple config shape; the harness key provides the meaning.
export type ClaudeConfig = SimpleConfig;
export type CodexConfig = SimpleConfig;

export type OpenCodeConfig = z.infer<typeof OpenCodeConfigSchema>;

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
  promptSection(prompt: typeof inquirer, section: HarnessSection): Promise<HarnessSection>;
  installAgents(section: HarnessSection, basePath: string): void;
  mergeHarnessConfig(section: HarnessSection, basePath: string): void;
  fileList(basePath: string): FileEntry[];
  remove(section: HarnessSection, basePath: string): void;
}
