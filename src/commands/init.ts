import { execFileSync } from 'child_process';
import { join } from 'path';
import { homedir } from 'os';
import { readConfig, writeConfig, getDefaultConfig, validateConfig, toSharedConfig, CONFIG_FILE } from '../utils/config.js';
import {
  HARNESS_CHOICES,
  parseHarness,
  getGlobalBasePath,
  promptForModels,
  generateFiles,
  buildFileList,
  shortPath,
} from '../harness.js';
import { HarnessRequiredError, InvalidConfigError, SkillsInstallError } from '../utils/errors.js';
import inquirer from 'inquirer';
import type { Harness, AtelierConfig, HarnessSection } from '../types.js';

export interface InitOptions {
  harness?: string;
  all?: boolean;
  yes?: boolean;
}

export async function init(options: InitOptions): Promise<void> {
  const harnessOption = options.harness;
  if (options.yes && !harnessOption) {
    throw new HarnessRequiredError();
  }

  let harness: Harness;
  if (harnessOption) {
    harness = parseHarness(harnessOption);
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
  const configResult = readConfig(configPath);

  if (!configResult.ok) {
    if (configResult.error.type === 'not-found') {
      // Continue with default config below
    } else {
      throw new InvalidConfigError(
        configResult.error.message,
        { suggestReinit: configResult.error.type === 'old-format' }
      );
    }
  }

  const existingConfig = configResult.ok ? configResult.value : undefined;
  const defaults = getDefaultConfig(harness);

  const config: AtelierConfig = existingConfig
    ? { ...existingConfig }
    : defaults;

  let section: HarnessSection = config[harness] ?? defaults[harness]!;

  if (!options.yes) {
    section = await promptForModels(section, harness);
  }

  config[harness] = section;

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

  const shared = toSharedConfig(config);

  generateFiles(shared, section, harness, harnessBasePath);
  writeConfig(config, configPath);

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
