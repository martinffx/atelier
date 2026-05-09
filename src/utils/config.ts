import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import type { AtelierConfig, Harness } from '../types.js';
import { defaultModels } from '../models.js';

const CONFIG_PATH = '.atelier/config.json';
const CURRENT_VERSION = '0.1.0';

export function readConfig(path: string = CONFIG_PATH): AtelierConfig | null {
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content) as AtelierConfig;
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

export function getDefaultConfig(harness: Harness): AtelierConfig {
  const defaults = defaultModels[harness];

  const agents = (['scout', 'oracle', 'architect'] as const).map(name => ({
    template: name,
    name,
    model: defaults[name],
  }));

  return {
    version: CURRENT_VERSION,
    harness,
    skills_source: 'martinffx/atelier',
    skills_path: '~/.agents/skills/atelier',
    agents,
  };
}
