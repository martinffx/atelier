import { readConfig } from '../utils/config.js';
import { generateClaude } from '../generators/claude.js';
import { generateOpenCode } from '../generators/opencode.js';

export function update(): void {
  const config = readConfig();

  if (!config) {
    console.error('Error: .atelier/config.json not found. Run `atelier init` first.');
    process.exit(1);
  }

  if (config.harness === 'claude') {
    generateClaude(config);
  } else {
    generateOpenCode(config);
  }

  console.log('Atelier updated.');
  console.log('Skills not updated. Run `npx skills update martinffx/atelier` if needed.');
}