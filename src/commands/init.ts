import { execSync } from 'child_process';
import { detectHarness } from '../utils/detect.js';
import { readConfig, writeConfig, getDefaultConfig } from '../utils/config.js';
import { generateClaude } from '../generators/claude.js';
import { generateOpenCode } from '../generators/opencode.js';
import { getModelsForHarness } from '../utils/templates.js';
import { HarnessNotDetectedError, ConfigNotFoundError, SkillsInstallError, handleError } from '../utils/errors.js';
import inquirer from 'inquirer';
import type { Harness, AtelierConfig } from '../types.js';

interface InitOptions {
  harness?: string;
  all?: boolean;
  yes?: boolean;
  project?: boolean;
}

export async function init(options: InitOptions): Promise<void> {
  let detected = detectHarness(options.harness as Harness | undefined);

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

  const config = readConfig();

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
      process.exit(0);
    }
  }

  let finalConfig: AtelierConfig;

  if (config) {
    finalConfig = config;
    if (options.harness && options.harness !== config.harness) {
      finalConfig.harness = options.harness as Harness;
    }
  } else {
    const skillsPath = options.project
      ? './.agents/skills/atelier'
      : '~/.agents/skills/atelier';
    finalConfig = getDefaultConfig(detected);
    finalConfig.skills_path = skillsPath;
  }

  if (!options.yes) {
    const harnessModels = getModelsForHarness(finalConfig.harness);
    const agentNames = ['scout', 'oracle', 'architect'] as const;

    const prompts = agentNames.map((name, i) => {
      const currentModel = finalConfig.agents[i].model;
      return {
        type: 'list',
        name,
        message: `Select model for ${name} (current: ${currentModel})`,
        choices: harnessModels,
        default: currentModel,
      };
    });

    const answers = await inquirer.prompt(prompts);

    for (let i = 0; i < agentNames.length; i++) {
      finalConfig.agents[i].model = answers[agentNames[i]];
    }
  }

  writeConfig(finalConfig);

  if (finalConfig.harness === 'claude') {
    generateClaude(finalConfig);
  } else {
    generateOpenCode(finalConfig);
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
  }

  console.log('\nNext steps:');
  if (!options.all) {
    console.log('  npx skills add martinffx/atelier  # install skills');
  }
  console.log('  atelier update                  # update hooks and agents');
}