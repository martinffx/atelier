import { writeFileSync, mkdirSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { readTemplate } from '../utils/templates.js';
import type { ClaudeConfig, SharedConfig, HarnessAdapter, FileEntry, Provider } from '../types.js';
import { AGENT_NAMES } from '../types.js';
import { FileWriteError, HarnessConfigError } from '../utils/errors.js';
import { shortPath } from '../services/paths.js';
import { SimpleConfigSchema } from '../utils/schemas.js';

const ANTHROPIC_MODELS = ['haiku', 'sonnet', 'opus', 'opusplan'] as const;

const DEFAULT_MODELS = {
  default_model: 'opusplan',
  recon: 'haiku',
  oracle: 'opus',
  architect: 'opus',
} as const;

export const claudeAdapter: HarnessAdapter = {
  name: 'claude',
  configSchema: SimpleConfigSchema,
  defaultSection,
  modelsForProvider,
  installAgents,
  mergeHarnessConfig,
  fileList,
  remove,
};

function defaultSection(): ClaudeConfig {
  return {
    provider: 'anthropic',
    default_model: DEFAULT_MODELS.default_model,
    agents: AGENT_NAMES.map(name => ({
      template: name,
      name,
      model: DEFAULT_MODELS[name],
    })),
  };
}

function modelsForProvider(_provider?: Provider): readonly string[] {
  return [...ANTHROPIC_MODELS];
}

function installAgents(_shared: SharedConfig, config: ClaudeConfig, basePath: string): void {
  const agentsDir = join(basePath, '.claude', 'agents');

  try {
    mkdirSync(agentsDir, { recursive: true });
  } catch (err) {
    throw new FileWriteError(agentsDir, err instanceof Error ? err.message : String(err));
  }

  for (const agent of config.agents) {
    const template = readTemplate(agent.template);
    const frontmatter = `---\nname: ${agent.name}\ndescription: ${template.description}\nmodel: ${agent.model}\n---\n`;
    const content = frontmatter + template.body;

    const agentPath = join(agentsDir, `${agent.name}.md`);
    writeFileSync(agentPath, content);
    console.log(`Created ${shortPath(agentPath)}`);
  }
}

function mergeHarnessConfig(_shared: SharedConfig, config: ClaudeConfig, basePath: string): void {
  const claudeDir = join(basePath, '.claude');
  const settingsPath = join(claudeDir, 'settings.json');
  const existing = readExistingSettings(settingsPath);
  const isNew = Object.keys(existing).length === 0;

  const settings: ExistingSettings = {
    ...existing,
    $schema: 'https://json.schemastore.org/claude-code-settings.json',
    model: config.default_model || DEFAULT_MODELS.default_model,
  };

  removeAtelierSessionStartHooks(settings);

  try {
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  } catch (err) {
    throw new FileWriteError(settingsPath, err instanceof Error ? err.message : String(err));
  }
  console.log(`${isNew ? 'Created' : 'Updated'} ${shortPath(settingsPath)}`);
}

function fileList(basePath: string): FileEntry[] {
  const files: FileEntry[] = [
    { path: join(basePath, '.claude', 'settings.json'), exists: existsSync(join(basePath, '.claude', 'settings.json')) },
  ];
  for (const name of AGENT_NAMES) {
    const path = join(basePath, '.claude', 'agents', `${name}.md`);
    files.push({ path, exists: existsSync(path) });
  }
  return files;
}

function remove(_shared: SharedConfig, config: ClaudeConfig, basePath: string): void {
  const claudeDir = join(basePath, '.claude');
  const agentsDir = join(claudeDir, 'agents');

  for (const agent of config.agents) {
    const file = join(agentsDir, `${agent.name}.md`);
    if (existsSync(file)) {
      rmSync(file, { force: true });
    }
  }

  if (existsSync(agentsDir)) {
    rmSync(agentsDir, { recursive: true, force: true });
  }

  const hookPath = join(basePath, 'hooks', 'atelier-session-start');
  if (existsSync(hookPath)) {
    rmSync(hookPath, { force: true });
  }

  removeAtelierSettings(claudeDir);
}

function removeAtelierSettings(claudeDir: string): void {
  const settingsPath = join(claudeDir, 'settings.json');
  if (!existsSync(settingsPath)) {
    return;
  }

  const content = parseSettingsJson(settingsPath);
  delete content.$schema;
  delete content.model;
  removeAtelierSessionStartHooks(content);
  writeOrDeleteSettings(settingsPath, content);
}

function parseSettingsJson(settingsPath: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(settingsPath, 'utf-8')) as Record<string, unknown>;
  } catch (err) {
    throw new HarnessConfigError(settingsPath, err instanceof Error ? err.message : String(err));
  }
}

function writeOrDeleteSettings(settingsPath: string, content: Record<string, unknown>): void {
  if (Object.keys(content).length === 0) {
    rmSync(settingsPath, { force: true });
  } else {
    writeFileSync(settingsPath, JSON.stringify(content, null, 2) + '\n');
  }
}

interface SessionStartHook {
  hooks: { command?: string; type?: string }[];
  matcher?: string;
}

interface ExistingSettings {
  model?: string;
  hooks?: { SessionStart?: SessionStartHook[] };
  [key: string]: unknown;
}

function readExistingSettings(settingsPath: string): ExistingSettings {
  try {
    const content = readFileSync(settingsPath, 'utf-8');
    return JSON.parse(content) as ExistingSettings;
  } catch {
    return {};
  }
}

function removeAtelierSessionStartHooks(content: Record<string, unknown>): void {
  if (!content.hooks || typeof content.hooks !== 'object' || Array.isArray(content.hooks)) {
    return;
  }

  const hooks = content.hooks as Record<string, unknown>;
  const sessionStart = hooks.SessionStart as Record<string, unknown>[] | undefined;
  if (!Array.isArray(sessionStart)) {
    return;
  }

  const filtered = sessionStart.filter((hook) => {
    const innerHooks = hook.hooks as Array<Record<string, unknown>> | undefined;
    return !innerHooks?.some((h: Record<string, unknown>) => h.command === 'hooks/atelier-session-start');
  });
  hooks.SessionStart = filtered;

  if (filtered.length === 0) {
    delete hooks.SessionStart;
  }
  if (Object.keys(hooks).length === 0) {
    delete content.hooks;
  }
}
