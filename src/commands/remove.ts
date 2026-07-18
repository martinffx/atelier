import { join } from 'path';
import { homedir } from 'os';
import { readConfig, writeConfig, removeConfigDir, getConfiguredHarnesses, CONFIG_FILE } from '../utils/config.js';
import { getAdapter } from '../registry.js';
import { resolveBasePath } from '../services/paths.js';
import { ConfigNotFoundError, InvalidConfigError } from '../utils/errors.js';
import { resolveHarness } from './utils.js';
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
  const harness = await resolveHarness(config, options?.harness, 'remove');

  const basePath = resolveBasePath(harness);
  const section = config[harness];

  if (!section) {
    throw new InvalidConfigError(`Harness '${harness}' is not configured.`);
  }

  const adapter = getAdapter(harness);
  adapter.remove(section, basePath);

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
