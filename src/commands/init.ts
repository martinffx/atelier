import { existsSync } from 'fs';
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
        choices: ['opencode', 'claude'],
        default: 'opencode',
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
    } else {
      const currentProvider = selectedProvider || 'opencode-zen';
      const { provider } = await inquirer.prompt([
        {
          type: 'list',
          name: 'provider',
          message: 'Which provider are you using?',
          choices: providerChoices,
          default: currentProvider,
        },
      ]);
      selectedProvider = provider;
      finalConfig.provider = selectedProvider;
      // Only replace config completely on fresh init; on re-init preserve existing settings
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
    const agentNames = ['recon', 'oracle', 'architect'] as const;

    const promptDefs: { type: 'list'; name: string; message: string; choices: readonly string[]; default: string }[] = [];

    if (detected === 'opencode') {
      const buildCurrent = finalConfig.build_model || harnessModels[0];
      const planCurrent = finalConfig.plan_model || harnessModels[0];
      promptDefs.push(
        {
          type: 'list' as const,
          name: 'build_model',
          message: `Select model for build (current: ${buildCurrent})`,
          choices: harnessModels,
          default: buildCurrent && harnessModels.includes(buildCurrent) ? buildCurrent : harnessModels[0],
        },
        {
          type: 'list' as const,
          name: 'plan_model',
          message: `Select model for plan (current: ${planCurrent})`,
          choices: harnessModels,
          default: planCurrent && harnessModels.includes(planCurrent) ? planCurrent : harnessModels[0],
        }
      );
    } else {
      const currentDefault = finalConfig.default_model || 'opusplan';
      promptDefs.push({
        type: 'list' as const,
        name: 'default_model',
        message: `Select default model (current: ${currentDefault})`,
        choices: harnessModels,
        default: currentDefault,
      });
    }

    for (const name of agentNames) {
      const agent = finalConfig.agents.find(a => a.name === name);
      const currentModel = agent?.model;
      const defaultModel = currentModel && harnessModels.includes(currentModel)
        ? currentModel
        : harnessModels[0];
      promptDefs.push({
        type: 'list' as const,
        name,
        message: `Select model for ${name} (current: ${defaultModel})`,
        choices: harnessModels,
        default: defaultModel,
      });
    }

    const answers: Record<string, string> = {};
    let i = 0;
    while (i < promptDefs.length) {
      const p = promptDefs[i];
      const choices = i > 0 ? [...p.choices, '← Go back'] : p.choices;
      const result = await inquirer.prompt([{ type: p.type, name: p.name, message: p.message, choices, default: p.default }]);
      if (result[p.name] === '← Go back') {
        i--;
        continue;
      }
      answers[p.name] = result[p.name] as string;
      i++;
    }

    for (const name of agentNames) {
      const agent = finalConfig.agents.find(a => a.name === name);
      if (agent) {
        agent.model = answers[name];
      }
    }

    if (detected === 'opencode') {
      if (answers.build_model) finalConfig.build_model = answers.build_model;
      if (answers.plan_model) finalConfig.plan_model = answers.plan_model;
    } else {
      if (answers.default_model) finalConfig.default_model = answers.default_model;
    }
  }

  // Validate the final config before writing
  validateConfig(finalConfig);

  writeConfig(finalConfig, configPath);

  if (!options.yes) {
    const files = buildFileList(finalConfig, harnessBasePath);
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

function buildFileList(config: AtelierConfig, basePath: string): { path: string; exists: boolean }[] {
  const files: { path: string; exists: boolean }[] = [];

  if (config.harness === 'claude') {
    files.push(
      { path: join(basePath, '.claude/settings.json'), exists: existsSync(join(basePath, '.claude/settings.json')) },
      { path: join(basePath, 'hooks/atelier-session-start'), exists: existsSync(join(basePath, 'hooks/atelier-session-start')) },
    );
    for (const agent of config.agents) {
      files.push({ path: join(basePath, '.claude/agents', `${agent.name}.md`), exists: existsSync(join(basePath, '.claude/agents', `${agent.name}.md`)) });
    }
  } else {
    const root = basePath === GLOBAL_OPENCODE_DIR ? basePath : join(basePath, '.opencode');
    files.push(
      { path: join(basePath, 'opencode.json'), exists: existsSync(join(basePath, 'opencode.json')) },
      { path: join(root, 'plugins/atelier.js'), exists: existsSync(join(root, 'plugins/atelier.js')) },
    );
    for (const agent of config.agents) {
      files.push({ path: join(root, 'agent', `${agent.name}.md`), exists: existsSync(join(root, 'agent', `${agent.name}.md`)) });
    }
  }

  return files;
}

function shortPath(p: string): string {
  const home = homedir();
  if (p.startsWith(home)) return '~' + p.slice(home.length);
  return p;
}
