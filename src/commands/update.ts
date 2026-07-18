import { join } from 'path';
import { homedir } from 'os';
import inquirer from 'inquirer';
import { readConfig, writeConfig, validateConfig, toSharedConfig, CONFIG_FILE, getConfiguredHarnesses } from '../utils/config.js';
import { getAdapter } from '../registry.js';
import { resolveBasePath } from '../services/paths.js';
import { promptForSection, formatFileList } from '../services/prompt.js';
import { ConfigNotFoundError, InvalidConfigError, InvalidHarnessError } from '../utils/errors.js';
import { HARNESS_NAMES } from '../types.js';
import type { Harness, AtelierConfig, HarnessSection } from '../types.js';

export interface UpdateOptions {
  harness?: string;
}

export async function update(options?: UpdateOptions): Promise<void> {
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
  const harness = await resolveHarness(config, options?.harness, 'update');

  const existingSection = config[harness];
  if (!existingSection) {
    throw new InvalidConfigError(`Harness '${harness}' is not configured. Run 'atelier init --harness ${harness}' first.`);
  }

  const adapter = getAdapter(harness);
  const section = await promptForSection(adapter, existingSection);

  const harnessBasePath = resolveBasePath(harness);
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

  config[harness] = section;

  const shared = toSharedConfig(config);

  validateConfig(config);
  adapter.mergeHarnessConfig(shared, section, harnessBasePath);
  adapter.installAgents(shared, section, harnessBasePath);
  writeConfig(config, configPath);

  console.log(`Atelier updated for ${harness}.`);
  console.log('Skills are managed separately. Run `npx skills update martinffx/atelier` to update skills.');
}

async function resolveHarness(config: AtelierConfig, harnessOption: string | undefined, command: string): Promise<Harness> {
  if (harnessOption) {
    if (!HARNESS_NAMES.includes(harnessOption as Harness)) {
      throw new InvalidHarnessError(harnessOption);
    }
    const configured = getConfiguredHarnesses(config);
    if (!configured.includes(harnessOption as Harness)) {
      throw new InvalidConfigError(`Harness '${harnessOption}' is not configured. Run 'atelier init --harness ${harnessOption}' first.`);
    }
    return harnessOption as Harness;
  }

  const configured = getConfiguredHarnesses(config);
  if (configured.length === 0) {
    throw new InvalidConfigError('No harnesses configured');
  }

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'harness',
      message: `Which harness do you want to ${command}?`,
      choices: configured,
    },
  ]);
  return answer.harness as Harness;
}

export { getConfiguredHarnesses };
