import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import { z } from 'zod';
import type { AtelierConfig, Harness, OpenCodeProvider, SimpleConfig, OpenCodeConfig, AgentConfig, SharedConfig } from '../types.js';
import { AGENT_NAMES, HARNESS_NAMES } from '../types.js';
// Side-load adapters so the registry is populated before we compose the schema.
import '../adapters/index.js';
import { listAdapters } from '../registry.js';
import { AgentSchema, SimpleConfigSchema, OpenCodeConfigSchema } from './schemas.js';
import { InvalidConfigError } from './errors.js';
import type { Result } from './result.js';
import { ok, err } from './result.js';

// Error-handling convention: readConfig returns Result<T,E> for expected I/O errors
// (not found, invalid JSON, old format). All other config functions throw AtelierError
// subclasses for logic/configuration errors.
export const CONFIG_FILE = '.atelier/config.json';
export const CONFIG_PATH = join(homedir(), CONFIG_FILE);
const CURRENT_VERSION = '0.1.0';

export type ConfigError =
  | { type: 'not-found' }
  | { type: 'invalid'; message: string }
  | { type: 'old-format'; message: string };

export { AgentSchema, SimpleConfigSchema, OpenCodeConfigSchema } from './schemas.js';

function buildConfigSchema() {
  const byName = Object.fromEntries(
    listAdapters().map(adapter => [adapter.name, adapter.configSchema])
  ) as Partial<Record<Harness, z.ZodSchema>>;

  return z.object({
    version: z.string(),
    skills_source: z.string(),
    skills_path: z.string().min(1),
    claude: byName.claude ? byName.claude.optional() : z.never().optional(),
    codex: byName.codex ? byName.codex.optional() : z.never().optional(),
    opencode: byName.opencode ? byName.opencode.optional() : z.never().optional(),
  }).refine(data => data.claude || data.codex || data.opencode, {
    message: 'At least one harness must be configured',
  });
}

export function validateConfig(config: unknown): AtelierConfig {
  const result = buildConfigSchema().safeParse(config);
  if (!result.success) {
    throw new InvalidConfigError(result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '));
  }
  return result.data as AtelierConfig;
}

export function readConfig(path: string = CONFIG_PATH): Result<AtelierConfig, ConfigError> {
  if (!existsSync(path)) {
    return err({ type: 'not-found' });
  }

  let content: string;
  try {
    content = readFileSync(path, 'utf-8');
  } catch (readErr) {
    return err({ type: 'invalid', message: `Failed to read ${path}: ${readErr instanceof Error ? readErr.message : String(readErr)}` });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (parseErr) {
    return err({ type: 'invalid', message: `Invalid JSON in ${path}: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}` });
  }

  if (isOldFlatConfig(parsed)) {
    return err({
      type: 'old-format',
      message: 'Config format has changed',
    });
  }

  try {
    return ok(validateConfig(parsed));
  } catch (validationErr) {
    const message = validationErr instanceof Error ? validationErr.message : String(validationErr);
    return err({ type: 'invalid', message });
  }
}

function isOldFlatConfig(config: unknown): boolean {
  if (typeof config !== 'object' || config === null) {
    return false;
  }
  const record = config as Record<string, unknown>;
  // Old flat config has a top-level harness field and no new-format harness sections.
  return (
    typeof record.harness === 'string' &&
    record.claude === undefined &&
    record.codex === undefined &&
    record.opencode === undefined
  );
}

export function writeConfig(config: AtelierConfig, path: string = CONFIG_PATH): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
}

export function toSharedConfig(config: AtelierConfig): SharedConfig {
  return {
    version: config.version,
    skills_source: config.skills_source,
    skills_path: config.skills_path,
  };
}

export function getConfiguredHarnesses(config: AtelierConfig): Harness[] {
  return HARNESS_NAMES.filter(harness => config[harness] !== undefined);
}

export function removeConfigDir(path: string = CONFIG_PATH): void {
  const dir = dirname(path);
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

function createEmptyAgents(): AgentConfig[] {
  return AGENT_NAMES.map(name => ({
    template: name,
    name,
    model: '',
  }));
}

export function getDefaultClaudeConfig(): SimpleConfig {
  return {
    provider: 'anthropic',
    default_model: 'opusplan',
    agents: createEmptyAgents().map(a => ({ ...a, model: a.name === 'recon' ? 'haiku' : 'opus' })),
  };
}

export function getDefaultCodexConfig(): SimpleConfig {
  return {
    provider: 'openai',
    default_model: 'gpt-5.6-terra',
    agents: createEmptyAgents().map(a => ({ ...a, model: a.name === 'recon' ? 'gpt-5.6-luna' : 'gpt-5.6-sol' })),
  };
}

export function getDefaultOpenCodeConfig(provider?: OpenCodeProvider): OpenCodeConfig {
  const selectedProvider = provider || 'opencode-zen';
  const defaults = {
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
  }[selectedProvider];

  return {
    provider: selectedProvider,
    build_model: defaults.build,
    plan_model: defaults.plan,
    agents: createEmptyAgents().map(a => ({ ...a, model: defaults[a.name] })),
  };
}

export function getDefaultConfig(harness: Harness): AtelierConfig {
  const shared = {
    version: CURRENT_VERSION,
    skills_source: 'martinffx/atelier',
    skills_path: '~/.agents/skills',
  };

  switch (harness) {
    case 'claude':
      return { ...shared, claude: getDefaultClaudeConfig() };
    case 'codex':
      return { ...shared, codex: getDefaultCodexConfig() };
    case 'opencode':
      return { ...shared, opencode: getDefaultOpenCodeConfig() };
    default: {
      const _exhaustive: never = harness;
      throw new InvalidConfigError(`Unknown harness: ${_exhaustive}`);
    }
  }
}

export function normalizeConfig(config: AtelierConfig): AtelierConfig {
  const normalized = { ...config };
  for (const harness of ['claude', 'codex'] as const) {
    const section = normalized[harness];
    if (section && !('provider' in section)) {
      normalized[harness] = {
        ...section,
        provider: harness === 'claude' ? 'anthropic' : 'openai',
      };
    }
  }
  return normalized;
}
