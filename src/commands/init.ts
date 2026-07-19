import { join } from 'path';
import { homedir } from 'os';
import inquirer from 'inquirer';
import { readConfig, writeConfig, getDefaultConfig, validateConfig, CONFIG_FILE } from '../utils/config.js';
import { getAdapter } from '../registry.js';
import { resolveBasePath } from '../services/paths.js';
import { promptForSection, formatFileList } from '../services/prompt.js';
import { HarnessRequiredError, InvalidConfigError, InvalidHarnessError } from '../utils/errors.js';
import type { Harness, AtelierConfig, HarnessSection } from '../types.js';
import { Harness as Harnesses } from '../constants.js';

export interface InitOptions {
  harness?: string;
  yes?: boolean;
}

export async function init(options: InitOptions): Promise<void> {
  const harnessOption = options.harness;
  if (options.yes && !harnessOption) {
    throw new HarnessRequiredError();
  }

  let harness: Harness;
  if (harnessOption) {
    if (!Harnesses.includes(harnessOption as Harness)) {
      throw new InvalidHarnessError(harnessOption);
    }
    harness = harnessOption as Harness;
  } else {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'harness',
        message: 'Which harness are you using?',
        choices: Harnesses,
      },
    ]);
    harness = answer.harness as Harness;
  }

  const configPath = join(homedir(), CONFIG_FILE);
  const configResult = readConfig(configPath);

  if (!configResult.ok) {
    if (configResult.error.type !== 'not-found') {
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

  const adapter = getAdapter(harness);

  if (!options.yes) {
    section = await promptForSection(adapter, section);
  }

  config[harness] = section;

  validateConfig(config);

  const harnessBasePath = resolveBasePath(harness);

  if (!options.yes) {
    const files = adapter.fileList(harnessBasePath);
    console.log('\nFiles to write:');
    console.log(formatFileList(files));
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

  adapter.mergeHarnessConfig(section, harnessBasePath);
  adapter.installAgents(section, harnessBasePath);
  writeConfig(config, configPath);

  console.log(`\nAtelier initialized for ${harness}.`);
  console.log('\nNext step:');
  if (harness === 'opencode' && 'provider' in section && section.provider === 'openai') {
    console.log('  opencode auth login --provider openai  # connect your OpenAI account');
  }
  console.log('  npx skills add martinffx/atelier  # install skills');
}
