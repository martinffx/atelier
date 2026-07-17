import { join } from 'path';
import { homedir } from 'os';
import { readConfig, writeConfig, removeConfigDir, toSharedConfig, CONFIG_FILE } from '../utils/config.js';
import { parseHarness, getConfiguredHarnesses, getGlobalBasePath, removeArtifacts } from '../harness.js';
import { ConfigNotFoundError, InvalidConfigError } from '../utils/errors.js';
import inquirer from 'inquirer';
import type { Harness } from '../types.js';

export interface RemoveOptions {
  harness?: string;
}

export async function remove(options?: RemoveOptions): Promise<void> {
  const harnessOption = options?.harness;
  const configPath = join(homedir(), CONFIG_FILE);

  const configResult = readConfig(configPath);

  if (!configResult.ok) {
    if (configResult.error.type === 'not-found') {
      throw new ConfigNotFoundError('remove');
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
        message: 'Which harness do you want to remove?',
        choices: configured,
      },
    ]);
    harness = answer.harness;
  }

  const basePath = getGlobalBasePath(harness);
  const section = config[harness];

  if (!section) {
    throw new InvalidConfigError(`Harness '${harness}' is not configured.`);
  }

  const shared = toSharedConfig(config);
  removeArtifacts(shared, section, harness, basePath);

  const updatedConfig = { ...config };
  delete updatedConfig[harness];

  const remainingHarnesses = getConfiguredHarnesses(updatedConfig);
  if (remainingHarnesses.length === 0) {
    removeConfigDir(configPath);
  } else {
    writeConfig(updatedConfig, configPath);
  }

  console.log(`Atelier removed for ${harness}.`);
  console.log('Skills remain installed. Run `npx skills remove martinffx/atelier` to remove skills.');
}
