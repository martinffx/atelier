import { rmSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { readConfig, writeConfig, CONFIG_FILE } from '../utils/config.js';
import { GLOBAL_OPENCODE_DIR } from '../generators/opencode.js';
import { ConfigNotFoundError, InvalidConfigError } from '../utils/errors.js';
import inquirer from 'inquirer';
import type { Harness, AtelierConfig } from '../types.js';

function isHarness(value: string): value is Harness {
  return value === 'claude' || value === 'opencode' || value === 'codex';
}

function getConfiguredHarnesses(config: AtelierConfig): Harness[] {
  const harnesses: Harness[] = [];
  if (config.claude) harnesses.push('claude');
  if (config.codex) harnesses.push('codex');
  if (config.opencode) harnesses.push('opencode');
  return harnesses;
}

export async function remove(options?: { harness?: string; basePath?: string }): Promise<void> {
  const { harness: harnessOption, basePath } = options ?? {};
  const resolvedBasePath = basePath ?? process.cwd();
  let configBasePath = resolvedBasePath;
  let harnessBasePath = resolvedBasePath;

  let config = readConfig(join(resolvedBasePath, CONFIG_FILE));

  if (!config && basePath === undefined) {
    configBasePath = homedir();
    config = readConfig(join(configBasePath, CONFIG_FILE));
  }

  if (!config) {
    throw new ConfigNotFoundError('remove');
  }

  let harness: Harness;
  if (harnessOption) {
    if (!isHarness(harnessOption)) {
      throw new InvalidConfigError(`Invalid harness: ${harnessOption}`);
    }
    harness = harnessOption;
  } else {
    const configured = getConfiguredHarnesses(config);
    if (configured.length === 0) {
      throw new InvalidConfigError('No harnesses configured');
    }
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'harness',
        message: 'Which harness do you want to remove?',
        choices: configured,
      },
    ]);
    harness = answer.harness;
  }

  if (harness === 'opencode' && basePath === undefined) {
    harnessBasePath = GLOBAL_OPENCODE_DIR;
  }

  if (harness === 'claude') {
    removeClaudeFiles(harnessBasePath);
  } else if (harness === 'opencode') {
    removeOpenCodeFiles(harnessBasePath);
  } else if (harness === 'codex') {
    removeCodexFiles(harnessBasePath);
  }

  delete config[harness];

  const remainingHarnesses = getConfiguredHarnesses(config);
  if (remainingHarnesses.length === 0) {
    rmSync(join(configBasePath, '.atelier'), { recursive: true, force: true });
  } else {
    writeConfig(config, join(configBasePath, CONFIG_FILE));
  }

  console.log(`Atelier removed for ${harness}.`);
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

  const opencodeJsonPath = join(basePath, 'opencode.json');
  if (existsSync(opencodeJsonPath)) {
    rmSync(opencodeJsonPath, { force: true });
  }
}

function removeCodexFiles(basePath: string): void {
  const files = [
    join(basePath, '.codex/agents/recon.toml'),
    join(basePath, '.codex/agents/oracle.toml'),
    join(basePath, '.codex/agents/architect.toml'),
  ];

  for (const file of files) {
    if (existsSync(file)) {
      rmSync(file, { force: true });
    }
  }

  const agentsDir = join(basePath, '.codex/agents');
  if (existsSync(agentsDir)) {
    rmSync(agentsDir, { recursive: true, force: true });
  }
}
