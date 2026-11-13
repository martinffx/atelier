import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import { z } from 'zod';
import type { AtelierConfig, Harness, SharedConfig, HarnessSection } from '../types.js';
import { Harness as Harnesses, LEGACY_AGENT_NAME } from '../constants.js';
import { listAdapters, getAdapter } from '../registry.js';
import { InvalidConfigError } from './errors.js';
import { thinkingChoices } from './thinking.js';
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

  if (hasOnlyCursorHarness(parsed)) {
    return err({
      type: 'invalid',
      message: 'This config only configures Cursor, which is no longer supported. Run `atelier remove --harness cursor` on version 3.7.0 (for example `npx @martinffx/atelier@3.7.0 remove --harness cursor`), or delete ~/.atelier/config.json.',
    });
  }

  try {
    return ok(validateConfig(migrateLegacyPlanMode(migrateLegacyAgentName(parsed))));
  } catch (validationErr) {
    const message = validationErr instanceof Error ? validationErr.message : String(validationErr);
    return err({ type: 'invalid', message });
  }
}

function migrateLegacyAgentName(config: unknown): unknown {
  if (typeof config !== 'object' || config === null) {
    return config;
  }

  const migrated = { ...(config as Record<string, unknown>) };
  for (const harness of Harnesses) {
    const section = migrated[harness];
    if (typeof section !== 'object' || section === null || !Array.isArray((section as Record<string, unknown>).agents)) {
      continue;
    }

    const agents = (section as Record<string, unknown>).agents as unknown[];
    migrated[harness] = {
      ...(section as Record<string, unknown>),
      agents: agents.map(agent => {
        if (typeof agent !== 'object' || agent === null) {
          return agent;
        }
        const entry = agent as Record<string, unknown>;
        return {
          ...entry,
          template: entry.template === LEGACY_AGENT_NAME ? 'sentinel' : entry.template,
          name: entry.name === LEGACY_AGENT_NAME ? 'sentinel' : entry.name,
        };
      }),
    };
  }
  return migrated;
}

// Plan mode no longer swaps models: each harness has one session model. Claude has one effort;
// Codex and OpenCode keep a separate plan effort on that model.
function migrateLegacyPlanMode(config: unknown): unknown {
  if (typeof config !== 'object' || config === null) {
    return config;
  }

  const migrated = { ...(config as Record<string, unknown>) };

  const claude = migrated.claude;
  if (typeof claude === 'object' && claude !== null) {
    const section = { ...(claude as Record<string, unknown>) };
    if (section.default_model === 'opusplan') {
      // Claude has one session effort, so it carries plan_thinking when set.
      section.build_thinking = section.plan_thinking ?? section.build_thinking;
    }
    if (Array.isArray(section.agents)) {
      section.agents = section.agents.map(agent => {
        if (typeof agent !== 'object' || agent === null || (agent as Record<string, unknown>).model !== 'opusplan') {
          return agent;
        }
        return { ...(agent as Record<string, unknown>), model: 'opus' };
      });
    }
    delete section.plan_thinking;
    migrated.claude = section;
  }

  const opencode = migrated.opencode;
  if (typeof opencode === 'object' && opencode !== null) {
    const section = { ...(opencode as Record<string, unknown>) };
    const legacy = section.build_model !== undefined || section.plan_model !== undefined;
    if (section.default_model === undefined && section.build_model !== undefined) {
      section.default_model = section.build_model;
    }
    delete section.build_model;
    delete section.plan_model;
    // The old plan_thinking belonged to plan_model, so keep it only if default_model also supports it.
    // Current-format configs are left alone so a bad value still fails validation.
    if (legacy) {
      const supported = typeof section.default_model === 'string'
        ? thinkingChoices('opencode', section.default_model) as readonly unknown[]
        : [];
      if (!supported.includes(section.plan_thinking)) delete section.plan_thinking;
    }
    migrated.opencode = section;
  }

  return migrated;
}

// Zod strips unknown keys, so a cursor-only config would otherwise surface as a generic validation error.
function hasOnlyCursorHarness(config: unknown): boolean {
  if (typeof config !== 'object' || config === null) {
    return false;
  }
  const record = config as Record<string, unknown>;
  return 'cursor' in record && Harnesses.every(harness => record[harness] == null);
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
