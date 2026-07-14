import { join } from 'path';
import { homedir } from 'os';
import { readConfig, writeConfig, CONFIG_FILE } from '../utils/config.js';
import {
  isHarness,
  getConfiguredHarnesses,
  getGlobalBasePath,
  promptForModels,
  generateFiles,
  buildFileList,
  shortPath,
} from '../utils/harness.js';
import { ConfigNotFoundError, InvalidConfigError } from '../utils/errors.js';
import inquirer from 'inquirer';
import type { Harness, AtelierConfig } from '../types.js';

export interface UpdateOptions {
  harness?: string;
}

export async function update(options?: UpdateOptions): Promise<void> {
  const harnessOption = options?.harness;
  const configPath = join(homedir(), CONFIG_FILE);

  const config = readConfig(configPath);

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

  await promptForModels(config, harness);

  writeConfig(config, configPath);

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

  generateFiles(config, harness, harnessBasePath);

  console.log(`Atelier updated for ${harness}.`);
  console.log('Skills are managed separately. Run `npx skills update martinffx/atelier` to update skills.');
}
