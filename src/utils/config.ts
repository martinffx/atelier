import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { z } from 'zod';
import type { AtelierConfig, Harness, Provider } from '../types.js';
import { defaultModels, providers } from '../models.js';
import { InvalidConfigError } from './errors.js';

export const CONFIG_FILE = '.atelier/config.json';
const CURRENT_VERSION = '0.1.0';

const AgentSchema = z.object({
  template: z.string(),
  name: z.string(),
  model: z.string(),
});

const ConfigSchema = z.object({
  version: z.string(),
  harness: z.enum(['claude', 'opencode']),
  provider: z.enum(['opencode-zen', 'opencode-go', 'amazon-bedrock']).optional(),
  skills_source: z.string(),
  skills_path: z.string().min(1),
  agents: z.array(AgentSchema).min(1),
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

  const config = validateConfig(parsed);

  // Validate provider/harness consistency
  if (config.harness === 'opencode' && !config.provider) {
    console.warn('Warning: OpenCode harness requires a provider. Defaulting to opencode-zen.');
    config.provider = 'opencode-zen';
  }
  if (config.harness === 'claude' && config.provider) {
    console.warn('Warning: Claude harness does not use providers. Ignoring provider field.');
    delete (config as AtelierConfig & { provider?: Provider }).provider;
  }
  if (config.provider && !providers[config.harness]?.includes(config.provider)) {
    console.warn(`Warning: Provider ${config.provider} is not valid for ${config.harness} harness.`);
  }

  return config;
}

export function writeConfig(config: AtelierConfig, path: string = CONFIG_PATH): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
}

export function getDefaultConfig(harness: Harness, provider?: Provider): AtelierConfig {
  const providerKey: Provider = harness === 'claude' ? 'anthropic' : (provider || 'opencode-zen');
  const defaults = defaultModels[providerKey];

  const agents = (['scout', 'oracle', 'architect'] as const).map(name => ({
    template: name,
    name,
    model: defaults[name],
  }));

  const config: AtelierConfig = {
    version: CURRENT_VERSION,
    harness,
    skills_source: 'martinffx/atelier',
    skills_path: '~/.agents/skills/atelier',
    agents,
  };

  if (harness === 'opencode' && provider) {
    config.provider = provider;
  }

  return config;
}
