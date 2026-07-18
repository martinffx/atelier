import { join } from 'path';
import { homedir } from 'os';
import { readConfig, writeConfig, removeConfigDir, toSharedConfig, CONFIG_FILE, getConfiguredHarnesses } from '../utils/config.js';
import { getAdapter } from '../registry.js';
import { resolveBasePath } from '../services/paths.js';
import { ConfigNotFoundError, InvalidConfigError, InvalidHarnessError } from '../utils/errors.js';
import { HARNESS_NAMES } from '../types.js';
import type { Harness, AtelierConfig } from '../types.js';

export interface RemoveOptions {
  harness?: string;
}

export async function remove(options?: RemoveOptions): Promise<void> {
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
  const harness = await resolveHarness(config, options?.harness);

  const basePath = resolveBasePath(harness);
  const section = config[harness];

  if (!section) {
    throw new InvalidConfigError(`Harness '${harness}' is not configured.`);
  }

  const adapter = getAdapter(harness);
  const shared = toSharedConfig(config);
  adapter.remove(shared, section, basePath);

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

async function resolveHarness(config: AtelierConfig, harnessOption: string | undefined): Promise<Harness> {
  if (harnessOption) {
    if (!HARNESS_NAMES.includes(harnessOption as Harness)) {
      throw new InvalidHarnessError(harnessOption);
    }
    const configured = getConfiguredHarnesses(config);
    if (!configured.includes(harnessOption as Harness)) {
      throw new InvalidConfigError(`Harness '${harnessOption}' is not configured.`);
    }
    return harnessOption as Harness;
  }

  const configured = getConfiguredHarnesses(config);
  if (configured.length === 0) {
    throw new InvalidConfigError('No harnesses configured');
  }

  const inquirer = await import('inquirer');
  const answer = await inquirer.default.prompt([
    {
      type: 'list',
      name: 'harness',
      message: 'Which harness do you want to remove?',
      choices: configured,
    },
  ]);
  return answer.harness as Harness;
}
