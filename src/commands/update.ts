import { join } from 'path';
import { readConfig, CONFIG_FILE } from '../utils/config.js';
import { generateClaude } from '../generators/claude.js';
import { generateOpenCode } from '../generators/opencode.js';
import { ConfigNotFoundError } from '../utils/errors.js';

export function update(basePath: string = process.cwd()): void {
  const config = readConfig(join(basePath, CONFIG_FILE));

  if (!config) {
    throw new ConfigNotFoundError('update');
  }

  if (config.harness === 'claude') {
    generateClaude(config, basePath);
  } else {
    generateOpenCode(config, basePath);
  }

  console.log('Atelier updated.');
  console.log('Skills not updated. Run `npx skills update martinffx/atelier` if needed.');
}
