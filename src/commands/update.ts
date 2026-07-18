import { join } from 'path';
import { homedir } from 'os';
import inquirer from 'inquirer';
import { readConfig, writeConfig, validateConfig, CONFIG_FILE } from '../utils/config.js';
import { getAdapter } from '../registry.js';
import { resolveBasePath } from '../services/paths.js';
import { promptForSection, formatFileList } from '../services/prompt.js';
import { ConfigNotFoundError, InvalidConfigError } from '../utils/errors.js';
import { resolveHarness } from './utils.js';
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

  validateConfig(config);
  adapter.mergeHarnessConfig(section, harnessBasePath);
  adapter.installAgents(section, harnessBasePath);
  writeConfig(config, configPath);

  console.log(`Atelier updated for ${harness}.`);
  console.log('Skills are managed separately. Run `npx skills update martinffx/atelier` to update skills.');
}
