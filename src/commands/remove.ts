import { rmSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import * as TOML from 'smol-toml';
import { readConfig, writeConfig, CONFIG_FILE } from '../utils/config.js';
import { isHarness, getConfiguredHarnesses, getGlobalBasePath } from '../utils/harness.js';
import { AGENT_NAMES } from '../types.js';
import { ConfigNotFoundError, InvalidConfigError } from '../utils/errors.js';
import inquirer from 'inquirer';
import type { Harness, AtelierConfig } from '../types.js';

export interface RemoveOptions {
  harness?: string;
}

export async function remove(options?: RemoveOptions): Promise<void> {
  const harnessOption = options?.harness;
  const configPath = join(homedir(), CONFIG_FILE);

  const config = readConfig(configPath);

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

  const basePath = getGlobalBasePath(harness);

  if (harness === 'claude') {
    removeClaudeArtifacts(basePath, config);
  } else if (harness === 'opencode') {
    removeOpenCodeArtifacts(basePath, config);
  } else if (harness === 'codex') {
    removeCodexArtifacts(basePath, config);
  }

  const updatedConfig = { ...config };
  if (harness === 'claude') delete updatedConfig.claude;
  else if (harness === 'codex') delete updatedConfig.codex;
  else if (harness === 'opencode') delete updatedConfig.opencode;

  const remainingHarnesses = getConfiguredHarnesses(updatedConfig);
  if (remainingHarnesses.length === 0) {
    rmSync(join(homedir(), '.atelier'), { recursive: true, force: true });
  } else {
    writeConfig(updatedConfig, configPath);
  }

  console.log(`Atelier removed for ${harness}.`);
  console.log('Skills remain installed. Run `npx skills remove martinffx/atelier` to remove skills.');
}

function removeClaudeArtifacts(basePath: string, config: AtelierConfig): void {
  const claudeConfig = config.claude;
  if (!claudeConfig) return;

  for (const name of AGENT_NAMES) {
    const file = join(basePath, '.claude/agents', `${name}.md`);
    if (existsSync(file)) {
      rmSync(file, { force: true });
    }
  }

  const agentsDir = join(basePath, '.claude/agents');
  if (existsSync(agentsDir)) {
    rmSync(agentsDir, { recursive: true, force: true });
  }

  const hookPath = join(basePath, 'hooks/atelier-session-start');
  if (existsSync(hookPath)) {
    rmSync(hookPath, { force: true });
  }

  const settingsPath = join(basePath, '.claude/settings.json');
  if (existsSync(settingsPath)) {
    try {
      const content = JSON.parse(readFileSync(settingsPath, 'utf-8')) as Record<string, unknown>;
      const hooks = (content.hooks as Record<string, unknown> | undefined) ?? {};

      if (Array.isArray(hooks.SessionStart)) {
        hooks.SessionStart = (hooks.SessionStart as Array<Record<string, unknown>>).filter(
          (hook: Record<string, unknown>) => {
            const innerHooks = hook.hooks as Array<Record<string, unknown>> | undefined;
            return !innerHooks?.some((h: Record<string, unknown>) => h.command === 'hooks/atelier-session-start');
          }
        );
        if ((hooks.SessionStart as unknown[]).length === 0) {
          delete hooks.SessionStart;
        }
        if (Object.keys(hooks).length === 0) {
          delete content.hooks;
        } else {
          content.hooks = hooks;
        }
      }

      if (content.model === claudeConfig.default_model) {
        delete content.model;
      }

      delete content.$schema;

      if (Object.keys(content).length === 0) {
        rmSync(settingsPath, { force: true });
      } else {
        writeFileSync(settingsPath, JSON.stringify(content, null, 2) + '\n');
      }
    } catch {
      // If we can't parse the settings, leave it alone
    }
  }
}

function removeCodexArtifacts(basePath: string, config: AtelierConfig): void {
  const codexConfig = config.codex;
  if (!codexConfig) return;

  for (const name of AGENT_NAMES) {
    const file = join(basePath, '.codex/agents', `${name}.toml`);
    if (existsSync(file)) {
      rmSync(file, { force: true });
    }
  }

  const agentsDir = join(basePath, '.codex/agents');
  if (existsSync(agentsDir)) {
    rmSync(agentsDir, { recursive: true, force: true });
  }

  const configPath = join(basePath, '.codex/config.toml');
  if (existsSync(configPath)) {
    try {
      const content = TOML.parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>;

      if (content.model === codexConfig.default_model) {
        delete content.model;
      }
      delete content.model_reasoning_effort;

      if (content.features && typeof content.features === 'object') {
        delete (content.features as Record<string, unknown>).multi_agent;
        if (Object.keys(content.features).length === 0) {
          delete content.features;
        }
      }

      if (content.agents && typeof content.agents === 'object') {
        delete (content.agents as Record<string, unknown>).max_threads;
        delete (content.agents as Record<string, unknown>).max_depth;
        if (Object.keys(content.agents).length === 0) {
          delete content.agents;
        }
      }

      if (Object.keys(content).length === 0) {
        rmSync(configPath, { force: true });
      } else {
        writeFileSync(configPath, TOML.stringify(content));
      }
    } catch {
      // If we can't parse the config, leave it alone
    }
  }
}

function removeOpenCodeArtifacts(basePath: string, config: AtelierConfig): void {
  const opencodeConfig = config.opencode;
  if (!opencodeConfig) return;

  const opencodeDir = basePath;

  for (const name of AGENT_NAMES) {
    const file = join(opencodeDir, 'agent', `${name}.md`);
    if (existsSync(file)) {
      rmSync(file, { force: true });
    }
  }

  const pluginPath = join(opencodeDir, 'plugins/atelier.js');
  if (existsSync(pluginPath)) {
    rmSync(pluginPath, { force: true });
  }

  const commandsDir = join(opencodeDir, 'command');
  if (existsSync(commandsDir)) {
    const skillsDir = resolveSkillsPath(config.skills_path);
    if (skillsDir && existsSync(skillsDir)) {
      for (const entry of readdirSyncSafe(skillsDir)) {
        const commandPath = join(commandsDir, `${entry}.md`);
        if (existsSync(commandPath)) {
          rmSync(commandPath, { force: true });
        }
      }
    }
  }

  const opencodeJsonPath = join(basePath, 'opencode.json');
  if (existsSync(opencodeJsonPath)) {
    try {
      const content = JSON.parse(readFileSync(opencodeJsonPath, 'utf-8')) as Record<string, unknown>;

      if (content.agent && typeof content.agent === 'object') {
        delete (content.agent as Record<string, unknown>).build;
        delete (content.agent as Record<string, unknown>).plan;
        if (Object.keys(content.agent).length === 0) {
          delete content.agent;
        }
      }

      if (opencodeConfig.provider === 'amazon-bedrock' && content.provider && typeof content.provider === 'object') {
        delete (content.provider as Record<string, unknown>)['amazon-bedrock'];
        if (Object.keys(content.provider).length === 0) {
          delete content.provider;
        }
      }

      if (Object.keys(content).length === 0) {
        rmSync(opencodeJsonPath, { force: true });
      } else {
        writeFileSync(opencodeJsonPath, JSON.stringify(content, null, 2) + '\n');
      }
    } catch {
      // If we can't parse the config, leave it alone
    }
  }
}

function resolveSkillsPath(skillsPath: string): string | null {
  if (skillsPath.startsWith('~/')) {
    return join(homedir(), skillsPath.slice(2));
  }
  if (skillsPath.startsWith('/')) {
    return skillsPath;
  }
  return join(process.cwd(), skillsPath);
}

function readdirSyncSafe(dir: string): string[] {
  try {
    return readdirSync(dir, { encoding: 'utf-8' });
  } catch {
    return [];
  }
}
