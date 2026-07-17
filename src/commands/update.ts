import { join } from 'path';
import { homedir } from 'os';
import { readConfig, writeConfig, validateConfig, toSharedConfig, CONFIG_FILE } from '../utils/config.js';
import {
  parseHarness,
  getConfiguredHarnesses,
  getGlobalBasePath,
  promptForModels,
  generateFiles,
  buildFileList,
  shortPath,
} from '../harness.js';
import { ConfigNotFoundError, InvalidConfigError } from '../utils/errors.js';
import inquirer from 'inquirer';
import type { Harness, AtelierConfig, HarnessSection } from '../types.js';

export interface UpdateOptions {
  harness?: string;
}

export async function update(options?: UpdateOptions): Promise<void> {
  const harnessOption = options?.harness;
  const configPath = join(homedir(), CONFIG_FILE);

  const configResult = readConfig(configPath);

  if (!configResult.ok) {
    if (configResult.error.type === 'not-found') {
      throw new ConfigNotFoundError('update');
    }
    throw new InvalidConfigError(
      configResult.error.message,
      { suggestReinit: configResult.error.type === 'old-format' }
    );
  }

  const config = configResult.value;

  let harness: Harness;
  if (harnessOption) {
    harness = parseHarness(harnessOption);
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

  const existingSection = config[harness];
  if (!existingSection) {
    throw new InvalidConfigError(`Harness '${harness}' is not configured. Run 'atelier init --harness ${harness}' first.`);
  }

  const section = await promptForModels(existingSection, harness);

  const harnessBasePath = getGlobalBasePath(harness);

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

  config[harness] = section;

  const shared = toSharedConfig(config);

  validateConfig(config);
  generateFiles(shared, section, harness, harnessBasePath);
  writeConfig(config, configPath);

  console.log(`Atelier updated for ${harness}.`);
  console.log('Skills are managed separately. Run `npx skills update martinffx/atelier` to update skills.');
}
