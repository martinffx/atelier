import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { homedir } from 'os';
import { readConfig, writeConfig, getDefaultConfig, validateConfig, CONFIG_FILE } from '../utils/config.js';
import { generateClaude } from '../generators/claude.js';
import { generateOpenCode, GLOBAL_OPENCODE_DIR } from '../generators/opencode.js';
import { generateCodex } from '../generators/codex.js';
import { getModelsForProvider } from '../utils/templates.js';
import { HarnessRequiredError, SkillsInstallError } from '../utils/errors.js';
import inquirer from 'inquirer';
import type { Harness, AtelierConfig, Provider, ClaudeConfig, CodexConfig, OpenCodeConfig } from '../types.js';
import { defaultModels } from '../models.js';

export interface InitOptions {
  harness?: string;
  all?: boolean;
  yes?: boolean;
  project?: boolean;
  cwd?: string;
}

const HARNESS_CHOICES: Harness[] = ['claude', 'opencode', 'codex'];

const providerChoices: { name: string; value: Provider }[] = [
  { name: 'OpenCode Zen', value: 'opencode-zen' },
  { name: 'OpenCode Go', value: 'opencode-go' },
  { name: 'Amazon Bedrock', value: 'amazon-bedrock' },
];

function isHarness(value: string): value is Harness {
  return value === 'claude' || value === 'opencode' || value === 'codex';
}

function getSkillsPath(project?: boolean): string {
  return project ? './.agents/skills' : '~/.agents/skills';
}

function getConfigBasePath(options: InitOptions): string {
  return options.cwd || (options.project ? process.cwd() : homedir());
}

function getHarnessBasePath(harness: Harness, options: InitOptions): string {
  if (options.cwd) return options.cwd;
  if (options.project) return process.cwd();
  if (harness === 'opencode') return GLOBAL_OPENCODE_DIR;
  return homedir();
}

export async function init(options: InitOptions): Promise<void> {
  const harnessOption = options.harness;
  if (harnessOption !== undefined && !isHarness(harnessOption)) {
    throw new HarnessRequiredError();
  }
  if (options.yes && !harnessOption) {
    throw new HarnessRequiredError();
  }

  let harness: Harness;
  if (harnessOption) {
    harness = harnessOption;
  } else {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'harness',
        message: 'Which harness are you using?',
        choices: HARNESS_CHOICES,
      },
    ]);
    harness = answer.harness;
  }

  const configBasePath = getConfigBasePath(options);
  const harnessBasePath = getHarnessBasePath(harness, options);
  const configPath = join(configBasePath, CONFIG_FILE);

  const existingConfig = readConfig(configPath);

  const initialProvider: Provider | undefined = harness === 'opencode' ? 'opencode-zen' : undefined;
  const defaults = getDefaultConfig(harness, initialProvider);
  defaults.skills_path = options.project
    ? './.agents/skills'
    : (existingConfig?.skills_path ?? getSkillsPath(options.project));

  const config: AtelierConfig = existingConfig
    ? { ...existingConfig, ...defaults }
    : defaults;

  if (!options.yes) {
    await promptForModels(config, harness);
  }

  validateConfig(config);

  if (!options.yes) {
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
  }

  writeConfig(config, configPath);
  generateFiles(config, harness, harnessBasePath);

  console.log(`\nAtelier initialized for ${harness}.`);

  if (options.all) {
    console.log('\nInstalling skills...');
    try {
      const projectFlag = options.project ? '' : '--global';
      execSync(`npx skills add martinffx/atelier ${projectFlag}`, {
        stdio: 'inherit',
      });
    } catch (error) {
      throw new SkillsInstallError(error instanceof Error ? error.message : String(error));
    }
    console.log('  atelier update                  # regenerate command files after install');
  }

  console.log('\nNext steps:');
  if (!options.all) {
    console.log('  npx skills add martinffx/atelier  # install skills');
  }
  console.log('  atelier update                  # update hooks and agents');
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
