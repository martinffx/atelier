import { writeFileSync, mkdirSync, readFileSync, existsSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';
import * as TOML from 'smol-toml';
import { readTemplate } from '../utils/templates.js';
import type { CodexConfig, SharedConfig, HarnessAdapter, FileEntry, Provider } from '../types.js';
import { AGENT_NAMES } from '../types.js';
import { FileWriteError, HarnessConfigError } from '../utils/errors.js';
import { shortPath } from '../services/paths.js';
import { SimpleConfigSchema } from '../utils/schemas.js';

const OPENAI_MODELS = [
  'gpt-5.6-sol',
  'gpt-5.6-terra',
  'gpt-5.6-luna',
  'gpt-5.5',
  'gpt-5.4',
  'gpt-5.4-mini',
  'gpt-5.4-nano',
  'gpt-5.3-codex-spark',
] as const;

const DEFAULT_MODELS = {
  default_model: 'gpt-5.6-terra',
  recon: 'gpt-5.6-luna',
  oracle: 'gpt-5.6-sol',
  architect: 'gpt-5.6-sol',
} as const;

const MANAGED_CODEX_KEYS: Array<{ key: string; nested?: Record<string, string[]> }> = [
  { key: 'model' },
  { key: 'model_reasoning_effort' },
  {
    key: 'features',
    nested: { features: ['multi_agent'] },
  },
  {
    key: 'agents',
    nested: { agents: ['max_threads', 'max_depth'] },
  },
];

export const codexAdapter: HarnessAdapter = {
  name: 'codex',
  configSchema: SimpleConfigSchema,
  defaultSection,
  modelsForProvider,
  installAgents,
  mergeHarnessConfig,
  fileList,
  remove,
};

function defaultSection(): CodexConfig {
  return {
    provider: 'openai',
    default_model: DEFAULT_MODELS.default_model,
    agents: AGENT_NAMES.map(name => ({
      template: name,
      name,
      model: DEFAULT_MODELS[name],
    })),
  };
}

function modelsForProvider(_provider?: Provider): readonly string[] {
  return [...OPENAI_MODELS];
}

function installAgents(_shared: SharedConfig, config: CodexConfig, basePath: string): void {
  const codexDir = join(basePath, '.codex');
  const agentsDir = join(codexDir, 'agents');

  try {
    mkdirSync(agentsDir, { recursive: true });
  } catch (err) {
    throw new FileWriteError(agentsDir, err instanceof Error ? err.message : String(err));
  }

  for (const agent of config.agents) {
    const template = readTemplate(agent.template);
    const content = {
      name: agent.name,
      description: template.description,
      model: agent.model,
      model_reasoning_effort: 'medium',
      sandbox_mode: 'read-only',
      developer_instructions: template.body,
    };

    const agentPath = join(agentsDir, `${agent.name}.toml`);
    writeFileSync(agentPath, TOML.stringify(content));
    console.log(`Created ${shortPath(agentPath)}`);
  }
}

function mergeHarnessConfig(_shared: SharedConfig, config: CodexConfig, basePath: string): void {
  const codexDir = join(basePath, '.codex');
  const configPath = join(codexDir, 'config.toml');
  let existing: Record<string, unknown> = {};

  if (existsSync(configPath)) {
    try {
      existing = TOML.parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
    } catch (err) {
      throw new FileWriteError(configPath, err instanceof Error ? err.message : String(err));
    }
  }

  const merged = {
    ...existing,
    model: config.default_model,
    model_reasoning_effort: 'medium',
    features: {
      ...(isObject(existing.features) ? existing.features : {}),
      multi_agent: true,
    },
    agents: {
      ...(isObject(existing.agents) ? existing.agents : {}),
      max_threads: 6,
      max_depth: 1,
    },
  };

  try {
    mkdirSync(codexDir, { recursive: true });
    writeFileSync(configPath, TOML.stringify(merged));
  } catch (err) {
    throw new FileWriteError(configPath, err instanceof Error ? err.message : String(err));
  }
  console.log(`Updated ${shortPath(configPath)}`);
}

function fileList(basePath: string): FileEntry[] {
  const files: FileEntry[] = [
    { path: join(basePath, '.codex', 'config.toml'), exists: existsSync(join(basePath, '.codex', 'config.toml')) },
  ];
  for (const name of AGENT_NAMES) {
    const path = join(basePath, '.codex', 'agents', `${name}.toml`);
    files.push({ path, exists: existsSync(path) });
  }
  return files;
}

function remove(_shared: SharedConfig, config: CodexConfig, basePath: string): void {
  const codexDir = join(basePath, '.codex');
  const agentsDir = join(codexDir, 'agents');

  for (const agent of config.agents) {
    const file = join(agentsDir, `${agent.name}.toml`);
    if (existsSync(file)) {
      rmSync(file, { force: true });
    }
  }

  if (existsSync(agentsDir)) {
    rmSync(agentsDir, { recursive: true, force: true });
  }

  cleanCodexConfig(codexDir);
  removeEmptyCodexDir(codexDir);
}

function cleanCodexConfig(codexDir: string): void {
  const configPath = join(codexDir, 'config.toml');
  if (!existsSync(configPath)) {
    return;
  }

  const content = parseCodexConfig(configPath);
  removeManagedKeys(content);
  writeOrDeleteCodexConfig(configPath, content);
}

function parseCodexConfig(configPath: string): Record<string, unknown> {
  try {
    return TOML.parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
  } catch (err) {
    throw new HarnessConfigError(configPath, err instanceof Error ? err.message : String(err));
  }
}

function removeManagedKeys(content: Record<string, unknown>): void {
  for (const { key, nested } of MANAGED_CODEX_KEYS) {
    if (nested) {
      for (const [table, subKeys] of Object.entries(nested)) {
        const tableValue = content[table];
        if (isObject(tableValue)) {
          for (const subKey of subKeys) {
            delete tableValue[subKey];
          }
          if (Object.keys(tableValue).length === 0) {
            delete content[table];
          }
        }
      }
    } else {
      delete content[key];
    }
  }
}

function writeOrDeleteCodexConfig(configPath: string, content: Record<string, unknown>): void {
  if (Object.keys(content).length === 0) {
    rmSync(configPath, { force: true });
  } else {
    writeFileSync(configPath, TOML.stringify(content));
  }
}

function removeEmptyCodexDir(codexDir: string): void {
  if (existsSync(codexDir)) {
    const entries = readdirSync(codexDir);
    if (entries.length === 0) {
      rmSync(codexDir, { recursive: true, force: true });
    }
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
