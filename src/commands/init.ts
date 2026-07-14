import { execFileSync } from 'child_process';
import { join } from 'path';
import { homedir } from 'os';
import { readConfig, writeConfig, getDefaultConfig, validateConfig, CONFIG_FILE } from '../utils/config.js';
import {
  HARNESS_CHOICES,
  isHarness,
  getGlobalBasePath,
  promptForModels,
  generateFiles,
  buildFileList,
  shortPath,
} from '../utils/harness.js';
import { HarnessRequiredError, SkillsInstallError } from '../utils/errors.js';
import inquirer from 'inquirer';
import type { Harness, AtelierConfig } from '../types.js';

export interface InitOptions {
  harness?: string;
  all?: boolean;
  yes?: boolean;
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

  const configPath = join(homedir(), CONFIG_FILE);
  const existingConfig = readConfig(configPath);

  const initialProvider = harness === 'opencode' ? 'opencode-zen' : undefined;
  const defaults = getDefaultConfig(harness, initialProvider);

  const config: AtelierConfig = existingConfig
    ? { ...existingConfig }
    : defaults;

  if (existingConfig) {
    if (harness === 'claude') config.claude = defaults.claude;
    else if (harness === 'codex') config.codex = defaults.codex;
    else if (harness === 'opencode') config.opencode = defaults.opencode;
  }

  if (!options.yes) {
    await promptForModels(config, harness);
  }

  validateConfig(config);

  const harnessBasePath = getGlobalBasePath(harness);

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
      execFileSync('npx', ['skills', 'add', 'martinffx/atelier', '--global'], { stdio: 'inherit' });
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
