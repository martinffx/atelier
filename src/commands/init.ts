import { execSync } from 'child_process';
import { join } from 'path';
import { homedir } from 'os';
import { detectHarness } from '../utils/detect.js';
import { GLOBAL_OPENCODE_DIR } from '../generators/opencode.js';
import { readConfig, writeConfig, getDefaultConfig, validateConfig, CONFIG_FILE } from '../utils/config.js';
import { generateClaude } from '../generators/claude.js';
import { generateOpenCode } from '../generators/opencode.js';
import { getModelsForProvider } from '../utils/templates.js';
import { HarnessNotDetectedError, SkillsInstallError, handleError } from '../utils/errors.js';
import inquirer from 'inquirer';
import type { Harness, AtelierConfig, Provider } from '../types.js';

export interface InitOptions {
  harness?: string;
  all?: boolean;
  yes?: boolean;
  project?: boolean;
  cwd?: string;
}

const providerChoices: { name: string; value: Provider }[] = [
  { name: 'OpenCode Zen', value: 'opencode-zen' },
  { name: 'OpenCode Go', value: 'opencode-go' },
  { name: 'Amazon Bedrock', value: 'amazon-bedrock' },
];

function isHarness(value: string): value is Harness {
  return value === 'claude' || value === 'opencode';
}

function getSkillsPath(project?: boolean): string {
  return project ? './.agents/skills/atelier' : '~/.agents/skills/atelier';
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
    throw new HarnessNotDetectedError();
  }

  let detected = detectHarness(harnessOption);

  if (!detected && !options.yes) {
    const { harness } = await inquirer.prompt([
      {
        type: 'list',
        name: 'harness',
        message: 'Which harness are you using?',
        choices: ['claude', 'opencode'],
        default: 'claude',
      },
    ]);
    detected = harness;
  }

  if (!detected) {
    throw new HarnessNotDetectedError();
  }

  const configBasePath = getConfigBasePath(options);
  const harnessBasePath = getHarnessBasePath(detected, options);
  const configPath = join(configBasePath, CONFIG_FILE);
  const config = readConfig(configPath);

  if (config && config.harness !== detected) {
    console.warn(`Warning: Switching harness from ${config.harness} to ${detected}.`);
    console.warn('This will remove .claude/ files and generate .opencode/ files.');
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Continue?',
        default: false,
      },
    ]);
    if (!confirm) {
      console.log('Cancelled.');
      return;
    }
  }

  let finalConfig: AtelierConfig;
  let selectedProvider: Provider | undefined;

  if (config) {
    finalConfig = config;
    if (harnessOption && harnessOption !== config.harness) {
      finalConfig.harness = harnessOption;
    }
    selectedProvider = finalConfig.provider;
  } else {
    finalConfig = getDefaultConfig(detected);
    finalConfig.skills_path = getSkillsPath(options.project);
  }

  // Provider selection for opencode harness
  if (detected === 'opencode') {
    if (options.yes) {
      selectedProvider = finalConfig.provider || 'opencode-zen';
      if (!finalConfig.provider) {
        finalConfig.provider = selectedProvider;
      }
      if (!config) {
        finalConfig = getDefaultConfig(detected, selectedProvider);
        finalConfig.skills_path = getSkillsPath(options.project);
      }
    } else if (!selectedProvider) {
      const { provider } = await inquirer.prompt([
        {
          type: 'list',
          name: 'provider',
          message: 'Which provider are you using?',
          choices: providerChoices,
          default: 'opencode-zen',
        },
      ]);
      selectedProvider = provider;
      finalConfig.provider = selectedProvider;
      if (!config) {
        finalConfig = getDefaultConfig(detected, selectedProvider);
        finalConfig.skills_path = getSkillsPath(options.project);
      }
    }
  }

  if (!options.yes) {
    const provider = detected === 'opencode'
      ? (selectedProvider || 'opencode-zen')
      : 'anthropic';
    const harnessModels = getModelsForProvider(provider);
    const agentNames = ['scout', 'oracle', 'architect'] as const;

    const prompts = agentNames.map((name) => {
      const agent = finalConfig.agents.find(a => a.name === name);
      const currentModel = agent?.model ?? harnessModels[0];
      return {
        type: 'list' as const,
        name,
        message: `Select model for ${name} (current: ${currentModel})`,
        choices: harnessModels,
        default: currentModel,
      };
    });

    const answers = await inquirer.prompt(prompts);

    for (const name of agentNames) {
      const agent = finalConfig.agents.find(a => a.name === name);
      if (agent) {
        agent.model = answers[name];
      }
    }
  }

  // Validate the final config before writing
  validateConfig(finalConfig);

  writeConfig(finalConfig, configPath);

  if (finalConfig.harness === 'claude') {
    generateClaude(finalConfig, harnessBasePath);
  } else {
    generateOpenCode(finalConfig, harnessBasePath);
  }

  console.log(`\nAtelier initialized for ${finalConfig.harness}.`);

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
