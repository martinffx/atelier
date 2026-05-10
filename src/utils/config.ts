import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import type { AtelierConfig, Harness, Provider } from '../types.js';
import { defaultModels, providers } from '../models.js';

const CONFIG_PATH = '.atelier/config.json';
const CURRENT_VERSION = '0.1.0';

export function readConfig(path: string = CONFIG_PATH): AtelierConfig | null {
  try {
    const content = readFileSync(path, 'utf-8');
    const config = JSON.parse(content) as AtelierConfig;

    // Validate provider/harness consistency
    if (config.harness === 'opencode' && !config.provider) {
      console.warn('Warning: OpenCode harness requires a provider. Defaulting to opencode-zen.');
      config.provider = 'opencode-zen';
    }
    if (config.harness === 'claude' && config.provider) {
      console.warn('Warning: Claude harness does not use providers. Ignoring provider field.');
      delete config.provider;
    }
    if (config.provider && !providers[config.harness]?.includes(config.provider)) {
      console.warn(`Warning: Provider ${config.provider} is not valid for ${config.harness} harness.`);
    }

    return config;
  } catch {
    return null;
  }
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
