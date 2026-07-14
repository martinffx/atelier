import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import { z } from 'zod';
import type { AtelierConfig, Harness, Provider } from '../types.js';
import { defaultModels } from '../models.js';
import { InvalidConfigError } from './errors.js';

export const CONFIG_FILE = '.atelier/config.json';
export const CONFIG_PATH = join(homedir(), CONFIG_FILE);
const CURRENT_VERSION = '0.1.0';

const AgentSchema = z.object({
  template: z.string(),
  name: z.string(),
  model: z.string(),
});

const ClaudeConfigSchema = z.object({
  default_model: z.string(),
  agents: z.array(AgentSchema).min(1),
});

const CodexConfigSchema = z.object({
  default_model: z.string(),
  agents: z.array(AgentSchema).min(1),
});

const OpenCodeConfigSchema = z.object({
  provider: z.enum(['opencode-zen', 'opencode-go', 'amazon-bedrock']),
  build_model: z.string(),
  plan_model: z.string(),
  agents: z.array(AgentSchema).min(1),
});

const ConfigSchema = z.object({
  version: z.string(),
  skills_source: z.string(),
  skills_path: z.string().min(1),
  claude: ClaudeConfigSchema.optional(),
  codex: CodexConfigSchema.optional(),
  opencode: OpenCodeConfigSchema.optional(),
}).refine(data => data.claude || data.codex || data.opencode, {
  message: 'At least one harness must be configured',
});

export function validateConfig(config: unknown): AtelierConfig {
  const result = ConfigSchema.safeParse(config);
  if (!result.success) {
    throw new InvalidConfigError(result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '));
  }
  return result.data as AtelierConfig;
}

export function readConfig(path: string = CONFIG_PATH): AtelierConfig | null {
  if (!existsSync(path)) {
    return null;
  }

  let content: string;
  try {
    content = readFileSync(path, 'utf-8');
  } catch (err) {
    throw new InvalidConfigError(`Failed to read ${path}: ${err instanceof Error ? err.message : String(err)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new InvalidConfigError(`Invalid JSON in ${path}: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (isOldFlatConfig(parsed)) {
    throw new InvalidConfigError('Config format has changed. Run `atelier init --harness <claude|opencode|codex>` to reconfigure.');
  }

  return validateConfig(parsed);
}

function isOldFlatConfig(config: unknown): boolean {
  return (
    typeof config === 'object' &&
    config !== null &&
    'harness' in config &&
    typeof (config as Record<string, unknown>).harness === 'string'
  );
}

export function writeConfig(config: AtelierConfig, path: string = CONFIG_PATH): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
}

export function getDefaultConfig(harness: Harness, provider?: Provider): AtelierConfig {
  const shared = {
    version: CURRENT_VERSION,
    skills_source: 'martinffx/atelier',
    skills_path: '~/.agents/skills',
  };

  const agents = (['recon', 'oracle', 'architect'] as const).map(name => ({
    template: name,
    name,
    model: '',
  }));

  switch (harness) {
    case 'claude': {
      const defaults = defaultModels.anthropic;
      return {
        ...shared,
        claude: {
          default_model: 'opusplan',
          agents: agents.map(a => ({ ...a, model: defaults[a.name] })),
        },
      };
    }
    case 'codex': {
      const defaults = defaultModels.openai;
      return {
        ...shared,
        codex: {
          default_model: defaults.default,
          agents: agents.map(a => ({ ...a, model: defaults[a.name] })),
        },
      };
    }
    case 'opencode': {
      const selectedProvider: Provider = provider || 'opencode-zen';
      const defaults = defaultModels[selectedProvider];
      return {
        ...shared,
        opencode: {
          provider: selectedProvider,
          build_model: defaults.build,
          plan_model: defaults.plan,
          agents: agents.map(a => ({ ...a, model: defaults[a.name] })),
        },
      };
    }
  }
}
