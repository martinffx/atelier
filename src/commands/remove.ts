import { rmSync, existsSync } from 'fs';
import { join } from 'path';
import { readConfig, CONFIG_FILE } from '../utils/config.js';
import { ConfigNotFoundError } from '../utils/errors.js';

export function remove(basePath: string = process.cwd()): void {
  const config = readConfig(join(basePath, CONFIG_FILE));

  if (!config) {
    throw new ConfigNotFoundError('remove');
  }

  if (config.harness === 'claude') {
    removeClaudeFiles(basePath);
  } else {
    removeOpenCodeFiles(basePath);
  }

  rmSync(join(basePath, '.atelier'), { recursive: true, force: true });

  console.log('Atelier removed from this project.');
  console.log('Skills remain installed. Run `npx skills remove martinffx/atelier` to remove skills.');
}

function removeClaudeFiles(basePath: string): void {
  const files = [
    join(basePath, '.claude/settings.json'),
    join(basePath, '.claude/agents/scout.md'),
    join(basePath, '.claude/agents/oracle.md'),
    join(basePath, '.claude/agents/architect.md'),
    join(basePath, 'hooks/atelier-session-start'),
  ];

  for (const file of files) {
    if (existsSync(file)) {
      rmSync(file, { force: true });
    }
  }

  const agentsDir = join(basePath, '.claude/agents');
  if (existsSync(agentsDir)) {
    rmSync(agentsDir, { recursive: true, force: true });
  }

  const claudeDir = join(basePath, '.claude');
  if (existsSync(claudeDir)) {
    rmSync(claudeDir, { recursive: true, force: true });
  }
}

function removeOpenCodeFiles(basePath: string): void {
  const files = [
    join(basePath, 'opencode.json'),
    join(basePath, '.opencode/plugins/atelier.js'),
    join(basePath, '.opencode/agents/scout.md'),
    join(basePath, '.opencode/agents/oracle.md'),
    join(basePath, '.opencode/agents/architect.md'),
  ];

  for (const file of files) {
    if (existsSync(file)) {
      rmSync(file, { force: true });
    }
  }

  const agentsDir = join(basePath, '.opencode/agents');
  if (existsSync(agentsDir)) {
    rmSync(agentsDir, { recursive: true, force: true });
  }

  const pluginsDir = join(basePath, '.opencode/plugins');
  if (existsSync(pluginsDir)) {
    rmSync(pluginsDir, { recursive: true, force: true });
  }

  const opencodeDir = join(basePath, '.opencode');
  if (existsSync(opencodeDir)) {
    rmSync(opencodeDir, { recursive: true, force: true });
  }
}
