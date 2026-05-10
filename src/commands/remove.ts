import { rmSync, existsSync } from 'fs';
import { readConfig } from '../utils/config.js';
import { ConfigNotFoundError } from '../utils/errors.js';

export function remove(): void {
  const config = readConfig();

  if (!config) {
    throw new ConfigNotFoundError('remove');
  }

  if (config.harness === 'claude') {
    removeClaudeFiles();
  } else {
    removeOpenCodeFiles();
  }

  rmSync('.atelier', { recursive: true, force: true });

  console.log('Atelier removed from this project.');
  console.log('Skills remain installed. Run `npx skills remove martinffx/atelier` to remove skills.');
}

function removeClaudeFiles(): void {
  const files = [
    '.claude/settings.json',
    '.claude/agents/scout.md',
    '.claude/agents/oracle.md',
    '.claude/agents/architect.md',
    'hooks/atelier-session-start',
  ];

  for (const file of files) {
    if (existsSync(file)) {
      rmSync(file, { force: true });
    }
  }

  const agentsDir = '.claude/agents';
  if (existsSync(agentsDir)) {
    rmSync(agentsDir, { recursive: true, force: true });
  }
}

function removeOpenCodeFiles(): void {
  const files = [
    'opencode.json',
    '.opencode/plugins/atelier.js',
    '.opencode/agents/scout.md',
    '.opencode/agents/oracle.md',
    '.opencode/agents/architect.md',
  ];

  for (const file of files) {
    if (existsSync(file)) {
      rmSync(file, { force: true });
    }
  }

  const agentsDir = '.opencode/agents';
  if (existsSync(agentsDir)) {
    rmSync(agentsDir, { recursive: true, force: true });
  }

  const pluginsDir = '.opencode/plugins';
  if (existsSync(pluginsDir)) {
    rmSync(pluginsDir, { recursive: true, force: true });
  }
}