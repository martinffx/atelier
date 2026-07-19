import { existsSync, mkdirSync, readdirSync, rmSync, rmdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import inquirer from 'inquirer';
import { AGENT_NAMES } from '../constants.js';
import { shortPath } from '../services/paths.js';
import type { CursorConfig, FileEntry, HarnessAdapter, HarnessSection, Provider } from '../types.js';
import { CursorConfigSchema } from '../utils/schemas.js';
import { FileWriteError } from '../utils/errors.js';
import { readTemplate } from '../utils/templates.js';

const CURSOR_MODELS = [
  'composer-2.5',
  'cursor-grok-4.5-high',
  'gpt-5.6-luna-medium',
  'gpt-5.6-terra-medium',
  'gpt-5.6-sol-medium',
  'claude-opus-4-8-high',
  'claude-sonnet-5-high',
  'kimi-k2.7-code',
  'glm-5.2-high',
] as const;

const DEFAULT_MODELS = {
  recon: 'composer-2.5',
  oracle: 'claude-opus-4-8-high',
  architect: 'gpt-5.6-sol-medium',
} as const;

export const cursorAdapter: HarnessAdapter = {
  name: 'cursor',
  configSchema: CursorConfigSchema,
  defaultSection,
  modelsForProvider,
  promptSection,
  installAgents,
  mergeHarnessConfig,
  fileList,
  remove,
};

function defaultSection(): CursorConfig {
  return {
    agents: AGENT_NAMES.map(name => ({ template: name, name, model: DEFAULT_MODELS[name] })),
  };
}

function modelsForProvider(_provider?: Provider): readonly string[] {
  return CURSOR_MODELS;
}

async function promptSection(prompt: typeof inquirer, section: HarnessSection): Promise<CursorConfig> {
  const config = section as CursorConfig;
  const answers = await prompt.prompt(AGENT_NAMES.map(name => ({
    type: 'list',
    name,
    message: `Select model for ${name}`,
    choices: CURSOR_MODELS,
    default: config.agents.find(agent => agent.name === name)?.model ?? DEFAULT_MODELS[name],
  })));

  return {
    agents: AGENT_NAMES.map(name => ({
      template: name,
      name,
      model: (answers[name] as string | undefined) ?? DEFAULT_MODELS[name],
    })),
  };
}

function installAgents(section: HarnessSection, basePath: string): void {
  const config = section as CursorConfig;
  const agentsDir = join(basePath, '.cursor', 'agents');

  try {
    mkdirSync(agentsDir, { recursive: true });
  } catch (err) {
    throw new FileWriteError(agentsDir, err instanceof Error ? err.message : String(err));
  }

  for (const agent of config.agents) {
    const template = readTemplate(agent.template);
    const content = `---\nname: ${agent.name}\ndescription: ${template.description}\nmodel: ${agent.model}\n---\n${template.body}`;
    const agentPath = join(agentsDir, `${agent.name}.md`);
    writeFileSync(agentPath, content);
    console.log(`Created ${shortPath(agentPath)}`);
  }
}

function mergeHarnessConfig(_section: HarnessSection, _basePath: string): void {
  // Cursor's native configuration, including its primary model, is user-managed.
}

function fileList(basePath: string): FileEntry[] {
  return AGENT_NAMES.map(name => {
    const path = join(basePath, '.cursor', 'agents', `${name}.md`);
    return { path, exists: existsSync(path) };
  });
}

function remove(section: HarnessSection, basePath: string): void {
  const config = section as CursorConfig;
  const agentsDir = join(basePath, '.cursor', 'agents');

  try {
    for (const agent of config.agents) {
      rmSync(join(agentsDir, `${agent.name}.md`), { force: true });
    }
    if (existsSync(agentsDir) && readdirSync(agentsDir).length === 0) {
      rmdirSync(agentsDir);
    }
  } catch (err) {
    throw new FileWriteError(agentsDir, err instanceof Error ? err.message : String(err));
  }
}
