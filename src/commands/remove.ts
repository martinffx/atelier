import { rmSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { readConfig, CONFIG_FILE } from '../utils/config.js';
import { GLOBAL_OPENCODE_DIR } from '../generators/opencode.js';
import { ConfigNotFoundError } from '../utils/errors.js';

export function remove(options?: { harness?: string; basePath?: string }): void {
  const { basePath } = options ?? {};
  const resolvedBasePath = basePath ?? process.cwd();
  let config = readConfig(join(resolvedBasePath, CONFIG_FILE));
  let harnessBasePath = resolvedBasePath;
  let configBasePath = resolvedBasePath;

  // Only fall back to global config when called without an explicit path
  if (!config && basePath === undefined) {
    configBasePath = homedir();
    config = readConfig(join(configBasePath, CONFIG_FILE));
    if (config) {
      harnessBasePath = config.harness === 'opencode'
        ? GLOBAL_OPENCODE_DIR
        : homedir();
    }
  }

  if (!config) {
    throw new ConfigNotFoundError('remove');
  }

  if (config.harness === 'claude') {
    removeClaudeFiles(harnessBasePath);
  } else {
    removeOpenCodeFiles(harnessBasePath);
  }

  rmSync(join(configBasePath, '.atelier'), { recursive: true, force: true });

  console.log('Atelier removed.');
  console.log('Skills remain installed. Run `npx skills remove martinffx/atelier` to remove skills.');
}

function removeClaudeFiles(basePath: string): void {
  const files = [
    join(basePath, '.claude/settings.json'),
    join(basePath, '.claude/agents/recon.md'),
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
  const isGlobal = basePath === GLOBAL_OPENCODE_DIR;
  const opencodeDir = isGlobal ? basePath : join(basePath, '.opencode');

  const files = [
    join(opencodeDir, 'plugins/atelier.js'),
    join(opencodeDir, 'agent/recon.md'),
    join(opencodeDir, 'agent/oracle.md'),
    join(opencodeDir, 'agent/architect.md'),
  ];

  for (const file of files) {
    if (existsSync(file)) {
      rmSync(file, { force: true });
    }
  }

  const agentsDir = join(opencodeDir, 'agent');
  if (existsSync(agentsDir)) {
    rmSync(agentsDir, { recursive: true, force: true });
  }

  const pluginsDir = join(opencodeDir, 'plugins');
  if (existsSync(pluginsDir)) {
    rmSync(pluginsDir, { recursive: true, force: true });
  }

  const commandsDir = join(opencodeDir, 'command');
  if (existsSync(commandsDir)) {
    rmSync(commandsDir, { recursive: true, force: true });
  }

  if (!isGlobal) {
    const opencodeDirPath = join(basePath, '.opencode');
    if (existsSync(opencodeDirPath)) {
      rmSync(opencodeDirPath, { recursive: true, force: true });
    }
  }

  // Also remove opencode.json
  const opencodeJsonPath = join(basePath, 'opencode.json');
  if (existsSync(opencodeJsonPath)) {
    rmSync(opencodeJsonPath, { force: true });
  }
}
