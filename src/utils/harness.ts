import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import inquirer from 'inquirer';
import type { Harness, AtelierConfig, Provider } from '../types.js';
import { AGENT_NAMES } from '../types.js';
import { defaultModels } from '../models.js';
import { getModelsForProvider } from './templates.js';
import { generateClaude } from '../generators/claude.js';
import { generateOpenCode, getGlobalOpencodeDir } from '../generators/opencode.js';
import { generateCodex } from '../generators/codex.js';
import { InvalidConfigError } from './errors.js';

export const HARNESS_CHOICES: Harness[] = ['claude', 'opencode', 'codex'];

export const providerChoices: { name: string; value: Provider }[] = [
  { name: 'OpenCode Zen', value: 'opencode-zen' },
  { name: 'OpenCode Go', value: 'opencode-go' },
  { name: 'Amazon Bedrock', value: 'amazon-bedrock' },
];

export function isHarness(value: string): value is Harness {
  return value === 'claude' || value === 'opencode' || value === 'codex';
}

export function getConfiguredHarnesses(config: AtelierConfig): Harness[] {
  const harnesses: Harness[] = [];
  if (config.claude) harnesses.push('claude');
  if (config.codex) harnesses.push('codex');
  if (config.opencode) harnesses.push('opencode');
  return harnesses;
}

export function getGlobalBasePath(harness: Harness): string {
  return harness === 'opencode' ? getGlobalOpencodeDir() : homedir();
}

export async function promptForModels(config: AtelierConfig, harness: Harness): Promise<void> {
  switch (harness) {
    case 'claude':
    case 'codex': {
      const harnessSection = harness === 'claude' ? config.claude : config.codex;
      if (!harnessSection) {
        throw new InvalidConfigError(`${harness} not configured`);
      }
      const provider: Provider = harness === 'claude' ? 'anthropic' : 'openai';
      const models = getModelsForProvider(provider);

      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'default_model',
          message: 'Select default model',
          choices: models,
          default: harnessSection.default_model,
        },
        ...AGENT_NAMES.map(name => ({
          type: 'list' as const,
          name,
          message: `Select model for ${name}`,
          choices: models,
          default: harnessSection.agents.find(a => a.name === name)?.model || models[0],
        })),
      ]);

      harnessSection.default_model = answers.default_model;
      for (const name of AGENT_NAMES) {
        const agent = harnessSection.agents.find(a => a.name === name);
        if (agent) agent.model = answers[name];
      }
      break;
    }
    case 'opencode': {
      const harnessSection = config.opencode;
      if (!harnessSection) {
        throw new InvalidConfigError('opencode not configured');
      }
      const { provider } = await inquirer.prompt([
        {
          type: 'list',
          name: 'provider',
          message: 'Which provider are you using?',
          choices: providerChoices,
          default: harnessSection.provider,
        },
      ]);

      const selectedProvider = provider as Provider;
      harnessSection.provider = selectedProvider;
      const defaults = defaultModels[selectedProvider];
      harnessSection.build_model = defaults.build;
      harnessSection.plan_model = defaults.plan;
      for (const agent of harnessSection.agents) {
        agent.model = defaults[agent.name];
      }

      const models = getModelsForProvider(provider);
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'build_model',
          message: 'Select model for build',
          choices: models,
          default: harnessSection.build_model,
        },
        {
          type: 'list',
          name: 'plan_model',
          message: 'Select model for plan',
          choices: models,
          default: harnessSection.plan_model,
        },
        ...AGENT_NAMES.map(name => ({
          type: 'list' as const,
          name,
          message: `Select model for ${name}`,
          choices: models,
          default: harnessSection.agents.find(a => a.name === name)?.model || models[0],
        })),
      ]);

      harnessSection.build_model = answers.build_model;
      harnessSection.plan_model = answers.plan_model;
      for (const name of AGENT_NAMES) {
        const agent = harnessSection.agents.find(a => a.name === name);
        if (agent) agent.model = answers[name];
      }
      break;
    }
  }
}

export function generateFiles(config: AtelierConfig, harness: Harness, basePath: string): void {
  switch (harness) {
    case 'claude': {
      const section = config.claude;
      if (!section) throw new InvalidConfigError('claude not configured');
      generateClaude({ ...config, ...section }, basePath);
      break;
    }
    case 'codex': {
      const section = config.codex;
      if (!section) throw new InvalidConfigError('codex not configured');
      generateCodex({ ...config, ...section }, basePath);
      break;
    }
    case 'opencode': {
      const section = config.opencode;
      if (!section) throw new InvalidConfigError('opencode not configured');
      generateOpenCode({ ...config, ...section }, basePath);
      break;
    }
  }
}

export function buildFileList(harness: Harness, basePath: string): { path: string; exists: boolean }[] {
  const files: { path: string; exists: boolean }[] = [];

  if (harness === 'claude') {
    files.push(
      { path: join(basePath, '.claude/settings.json'), exists: existsSync(join(basePath, '.claude/settings.json')) },
      { path: join(basePath, 'hooks/atelier-session-start'), exists: existsSync(join(basePath, 'hooks/atelier-session-start')) },
    );
    for (const name of AGENT_NAMES) {
      files.push({ path: join(basePath, '.claude/agents', `${name}.md`), exists: existsSync(join(basePath, '.claude/agents', `${name}.md`)) });
    }
  } else if (harness === 'opencode') {
    const root = basePath === getGlobalOpencodeDir() ? basePath : join(basePath, '.opencode');
    files.push(
      { path: join(basePath, 'opencode.json'), exists: existsSync(join(basePath, 'opencode.json')) },
      { path: join(root, 'plugins/atelier.js'), exists: existsSync(join(root, 'plugins/atelier.js')) },
    );
    for (const name of AGENT_NAMES) {
      files.push({ path: join(root, 'agent', `${name}.md`), exists: existsSync(join(root, 'agent', `${name}.md`)) });
    }
  } else if (harness === 'codex') {
    files.push(
      { path: join(basePath, '.codex/config.toml'), exists: existsSync(join(basePath, '.codex/config.toml')) },
    );
    for (const name of AGENT_NAMES) {
      files.push({ path: join(basePath, '.codex/agents', `${name}.toml`), exists: existsSync(join(basePath, '.codex/agents', `${name}.toml`)) });
    }
  }

  return files;
}

export function shortPath(p: string): string {
  const home = homedir();
  if (p === home || p.startsWith(home + '/')) {
    return '~' + p.slice(home.length);
  }
  return p;
}
