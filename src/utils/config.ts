import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import { z } from 'zod';
import type { AtelierConfig, Harness, SharedConfig, HarnessSection } from '../types.js';
import { Harness as Harnesses } from '../constants.js';
import { listAdapters, getAdapter } from '../registry.js';
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

function buildConfigSchema() {
  const adapters = listAdapters();
  const harnessShape: Record<string, z.ZodTypeAny> = {};
  for (const adapter of adapters) {
    harnessShape[adapter.name] = adapter.configSchema.optional();
  }

  return z.object({
    version: z.string(),
    skills_source: z.string(),
    skills_path: z.string().min(1),
    ...harnessShape,
  }).refine((data: Record<string, unknown>) => adapters.some(a => data[a.name] !== undefined), {
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
    Harnesses.every(harness => record[harness] == null)
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
  return Harnesses.filter(harness => config[harness] !== undefined);
}

export function removeConfigDir(path: string = CONFIG_PATH): void {
  const dir = dirname(path);
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function getDefaultConfig(harness: Harness): AtelierConfig {
  const section = getAdapter(harness).defaultSection();
  const config: Record<string, unknown> = {
    version: CURRENT_VERSION,
    skills_source: 'martinffx/atelier',
    skills_path: '~/.agents/skills',
  };
  config[harness] = section;
  return config as AtelierConfig;
}
