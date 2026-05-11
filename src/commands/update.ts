import { join } from 'path';
import { homedir } from 'os';
import { readConfig, CONFIG_FILE } from '../utils/config.js';
import { generateClaude } from '../generators/claude.js';
import { generateOpenCode, GLOBAL_OPENCODE_DIR } from '../generators/opencode.js';
import { ConfigNotFoundError } from '../utils/errors.js';

export function update(basePath?: string): void {
  const resolvedBasePath = basePath ?? process.cwd();
  let config = readConfig(join(resolvedBasePath, CONFIG_FILE));
  let harnessBasePath = resolvedBasePath;

  // Only fall back to global config when called without an explicit path
  if (!config && basePath === undefined) {
    config = readConfig(join(homedir(), CONFIG_FILE));
    if (config) {
      harnessBasePath = config.harness === 'opencode'
        ? GLOBAL_OPENCODE_DIR
        : homedir();
    }
  }

  if (!config) {
    throw new ConfigNotFoundError('update');
  }

  if (config.harness === 'claude') {
    generateClaude(config, harnessBasePath);
  } else {
    generateOpenCode(config, harnessBasePath);
  }

  console.log('Atelier updated.');
  console.log('Skills not updated. Run `npx skills update martinffx/atelier` if needed.');
}
