import { writeFileSync, mkdirSync, readFileSync, rmSync, rmdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import inquirer from 'inquirer';
import { readTemplate } from '../utils/templates.js';
import type { ClaudeConfig, HarnessAdapter, FileEntry, Provider, HarnessSection } from '../types.js';
import { FileWriteError, HarnessConfigError } from '../utils/errors.js';
import { shortPath } from '../services/paths.js';
import { SimpleConfigSchema } from '../utils/schemas.js';
import { promptForSimpleModels } from '../services/prompt.js';
import { AGENT_NAMES, LEGACY_AGENT_NAME } from '../constants.js';

const ANTHROPIC_MODELS = ['haiku', 'sonnet', 'opus', 'opusplan'] as const;

const DEFAULT_MODELS = {
  default_model: 'opusplan',
  sentinel: 'haiku',
  oracle: 'opus',
  architect: 'opus',
} as const;

export const claudeAdapter: HarnessAdapter = {
  name: 'claude',
  configSchema: SimpleConfigSchema,
  defaultSection,
  modelsForProvider,
  promptSection,
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

async function promptSection(prompt: typeof inquirer, section: HarnessSection): Promise<HarnessSection> {
  return promptForSimpleModels(prompt, section as ClaudeConfig, modelsForProvider());
}

function installAgents(section: HarnessSection, basePath: string): void {
  const config = section as ClaudeConfig;
  const agentsDir = join(basePath, '.claude', 'agents');

  try {
    mkdirSync(agentsDir, { recursive: true });
  } catch (err) {
    throw new FileWriteError(agentsDir, err instanceof Error ? err.message : String(err));
  }
  rmSync(join(agentsDir, `${LEGACY_AGENT_NAME}.md`), { force: true });

  for (const agent of config.agents) {
    const template = readTemplate(agent.template);
    const frontmatter = `---\nname: ${agent.name}\ndescription: ${template.description}\nmodel: ${agent.model}\n---\n`;
    const content = frontmatter + template.body;

    const agentPath = join(agentsDir, `${agent.name}.md`);
    writeFileSync(agentPath, content);
    console.log(`Created ${shortPath(agentPath)}`);
  }
}

function mergeHarnessConfig(section: HarnessSection, basePath: string): void {
  const config = section as ClaudeConfig;
  const claudeDir = join(basePath, '.claude');
  const settingsPath = join(claudeDir, 'settings.json');
  const existing = readExistingSettings(settingsPath);
  const isNew = Object.keys(existing).length === 0;

  const settings: ExistingSettings = {
    ...existing,
    $schema: 'https://json.schemastore.org/claude-code-settings.json',
    model: config.default_model || DEFAULT_MODELS.default_model,
  };

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

function remove(section: HarnessSection, basePath: string): void {
  const config = section as ClaudeConfig;
  const claudeDir = join(basePath, '.claude');
  const agentsDir = join(claudeDir, 'agents');

  for (const agent of config.agents) {
    const file = join(agentsDir, `${agent.name}.md`);
    if (existsSync(file)) {
      rmSync(file, { force: true });
    }
  }
  rmSync(join(agentsDir, `${LEGACY_AGENT_NAME}.md`), { force: true });

  removeDirIfEmpty(agentsDir);
  removeAtelierSettings(claudeDir);
}

function removeDirIfEmpty(dir: string): void {
  if (!existsSync(dir)) {
    return;
  }
  try {
    if (readdirSync(dir).length === 0) {
      rmdirSync(dir);
    }
  } catch (err) {
    throw new FileWriteError(dir, err instanceof Error ? err.message : String(err));
  }
}

function removeAtelierSettings(claudeDir: string): void {
  const settingsPath = join(claudeDir, 'settings.json');
  if (!existsSync(settingsPath)) {
    return;
  }

  const content = parseSettingsJson(settingsPath);
  delete content.$schema;
  delete content.model;
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
  try {
    if (Object.keys(content).length === 0) {
      rmSync(settingsPath, { force: true });
    } else {
      writeFileSync(settingsPath, JSON.stringify(content, null, 2) + '\n');
    }
  } catch (err) {
    throw new FileWriteError(settingsPath, err instanceof Error ? err.message : String(err));
  }
}

function readExistingSettings(settingsPath: string): ExistingSettings {
  if (!existsSync(settingsPath)) {
    return {};
  }
  try {
    const content = readFileSync(settingsPath, 'utf-8');
    return JSON.parse(content) as ExistingSettings;
  } catch (err) {
    throw new HarnessConfigError(settingsPath, err instanceof Error ? err.message : String(err));
  }
}

interface ExistingSettings {
  model?: string;
  [key: string]: unknown;
}
