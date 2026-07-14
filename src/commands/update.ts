import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { readConfig, writeConfig, CONFIG_FILE } from '../utils/config.js';
import { generateClaude } from '../generators/claude.js';
import { generateOpenCode, GLOBAL_OPENCODE_DIR } from '../generators/opencode.js';
import { generateCodex } from '../generators/codex.js';
import { getModelsForProvider } from '../utils/templates.js';
import { ConfigNotFoundError, InvalidConfigError } from '../utils/errors.js';
import inquirer from 'inquirer';
import type { Harness, AtelierConfig, Provider, ClaudeConfig, CodexConfig, OpenCodeConfig } from '../types.js';
import { defaultModels } from '../models.js';

const providerChoices: { name: string; value: Provider }[] = [
  { name: 'OpenCode Zen', value: 'opencode-zen' },
  { name: 'OpenCode Go', value: 'opencode-go' },
  { name: 'Amazon Bedrock', value: 'amazon-bedrock' },
];

function isHarness(value: string): value is Harness {
  return value === 'claude' || value === 'opencode' || value === 'codex';
}

function getConfiguredHarnesses(config: AtelierConfig): Harness[] {
  const harnesses: Harness[] = [];
  if (config.claude) harnesses.push('claude');
  if (config.codex) harnesses.push('codex');
  if (config.opencode) harnesses.push('opencode');
  return harnesses;
}

export async function update(options?: { harness?: string; basePath?: string }): Promise<void> {
  const { harness: harnessOption, basePath } = options ?? {};
  const resolvedBasePath = basePath ?? process.cwd();
  let configBasePath = resolvedBasePath;
  let harnessBasePath = resolvedBasePath;

  let config = readConfig(join(resolvedBasePath, CONFIG_FILE));

  if (!config && basePath === undefined) {
    configBasePath = homedir();
    config = readConfig(join(configBasePath, CONFIG_FILE));
  }

  if (!config) {
    throw new ConfigNotFoundError('update');
  }

  let harness: Harness;
  if (harnessOption) {
    if (!isHarness(harnessOption)) {
      throw new InvalidConfigError(`Invalid harness: ${harnessOption}`);
    }
    harness = harnessOption;
  } else {
    const configured = getConfiguredHarnesses(config);
    if (configured.length === 0) {
      throw new InvalidConfigError('No harnesses configured');
    }
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'harness',
        message: 'Which harness do you want to update?',
        choices: configured,
      },
    ]);
    harness = answer.harness;
  }

  if (harness === 'opencode' && basePath === undefined && config.opencode) {
    harnessBasePath = GLOBAL_OPENCODE_DIR;
  }

  await promptForModels(config, harness);

  writeConfig(config, join(configBasePath, CONFIG_FILE));

  const files = buildFileList(harness, harnessBasePath);
  console.log('\nFiles to write:');
  for (const f of files) {
    const label = f.exists ? '~' : '+';
    console.log(`  ${label} ${shortPath(f.path)}`);
  }
  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: 'Write these files?',
    default: true,
  }]);
  if (!confirm) {
    console.log('Cancelled.');
    return;
  }

  generateFiles(config, harness, harnessBasePath);

  console.log(`Atelier updated for ${harness}.`);
  console.log('Skills are managed separately. Run `npx skills update martinffx/atelier` to update skills.');
}

async function promptForModels(config: AtelierConfig, harness: Harness): Promise<void> {
  const agentNames = ['recon', 'oracle', 'architect'] as const;

  switch (harness) {
    case 'claude':
    case 'codex': {
      const section = harness === 'claude' ? config.claude! : config.codex!;
      const provider: Provider = harness === 'claude' ? 'anthropic' : 'openai';
      const models = getModelsForProvider(provider);

      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'default_model',
          message: 'Select default model',
          choices: models,
          default: section.default_model,
        },
        ...agentNames.map(name => ({
          type: 'list' as const,
          name,
          message: `Select model for ${name}`,
          choices: models,
          default: section.agents.find(a => a.name === name)?.model || models[0],
        })),
      ]);

      section.default_model = answers.default_model;
      for (const name of agentNames) {
        const agent = section.agents.find(a => a.name === name);
        if (agent) agent.model = answers[name];
      }
      break;
    }
    case 'opencode': {
      const section = config.opencode!;
      const { provider } = await inquirer.prompt([
        {
          type: 'list',
          name: 'provider',
          message: 'Which provider are you using?',
          choices: providerChoices,
          default: section.provider,
        },
      ]);

      const selectedProvider = provider as Provider;
      section.provider = selectedProvider;
      const defaults = defaultModels[selectedProvider];
      section.build_model = defaults.build;
      section.plan_model = defaults.plan;
      for (const agent of section.agents) {
        agent.model = defaults[agent.name as 'recon' | 'oracle' | 'architect'];
      }

      const models = getModelsForProvider(provider);
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'build_model',
          message: 'Select model for build',
          choices: models,
          default: section.build_model,
        },
        {
          type: 'list',
          name: 'plan_model',
          message: 'Select model for plan',
          choices: models,
          default: section.plan_model,
        },
        ...agentNames.map(name => ({
          type: 'list' as const,
          name,
          message: `Select model for ${name}`,
          choices: models,
          default: section.agents.find(a => a.name === name)?.model || models[0],
        })),
      ]);

      section.build_model = answers.build_model;
      section.plan_model = answers.plan_model;
      for (const name of agentNames) {
        const agent = section.agents.find(a => a.name === name);
        if (agent) agent.model = answers[name];
      }
      break;
    }
  }
}

function generateFiles(config: AtelierConfig, harness: Harness, basePath: string): void {
  switch (harness) {
    case 'claude':
      generateClaude({ ...config, ...config.claude! } as ClaudeConfig & Pick<AtelierConfig, 'version' | 'skills_source' | 'skills_path'>, basePath);
      break;
    case 'codex':
      generateCodex({ ...config, ...config.codex! } as CodexConfig & Pick<AtelierConfig, 'version' | 'skills_source' | 'skills_path'>, basePath);
      break;
    case 'opencode':
      generateOpenCode({ ...config, ...config.opencode! } as OpenCodeConfig & Pick<AtelierConfig, 'version' | 'skills_source' | 'skills_path'>, basePath);
      break;
  }
}

function buildFileList(harness: Harness, basePath: string): { path: string; exists: boolean }[] {
  const files: { path: string; exists: boolean }[] = [];

  if (harness === 'claude') {
    files.push(
      { path: join(basePath, '.claude/settings.json'), exists: existsSync(join(basePath, '.claude/settings.json')) },
      { path: join(basePath, 'hooks/atelier-session-start'), exists: existsSync(join(basePath, 'hooks/atelier-session-start')) },
    );
    for (const name of ['recon', 'oracle', 'architect']) {
      files.push({ path: join(basePath, '.claude/agents', `${name}.md`), exists: existsSync(join(basePath, '.claude/agents', `${name}.md`)) });
    }
  } else if (harness === 'opencode') {
    const root = basePath === GLOBAL_OPENCODE_DIR ? basePath : join(basePath, '.opencode');
    files.push(
      { path: join(basePath, 'opencode.json'), exists: existsSync(join(basePath, 'opencode.json')) },
      { path: join(root, 'plugins/atelier.js'), exists: existsSync(join(root, 'plugins/atelier.js')) },
    );
    for (const name of ['recon', 'oracle', 'architect']) {
      files.push({ path: join(root, 'agent', `${name}.md`), exists: existsSync(join(root, 'agent', `${name}.md`)) });
    }
  } else if (harness === 'codex') {
    files.push(
      { path: join(basePath, '.codex/config.toml'), exists: existsSync(join(basePath, '.codex/config.toml')) },
    );
    for (const name of ['recon', 'oracle', 'architect']) {
      files.push({ path: join(basePath, '.codex/agents', `${name}.toml`), exists: existsSync(join(basePath, '.codex/agents', `${name}.toml`)) });
    }
  }

  return files;
}

function shortPath(p: string): string {
  const home = homedir();
  if (p.startsWith(home)) return '~' + p.slice(home.length);
  return p;
}
