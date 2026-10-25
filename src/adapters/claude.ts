import { writeFileSync, mkdirSync, readFileSync, rmSync, rmdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import inquirer from 'inquirer';
import { readTemplate } from '../utils/templates.js';
import type { ClaudeConfig, HarnessAdapter, FileEntry, Provider, HarnessSection } from '../types.js';
import { FileWriteError, HarnessConfigError } from '../utils/errors.js';
import { shortPath } from '../services/paths.js';
import { ClaudeConfigSchema, CLAUDE_OPTIONAL_BUILTINS } from '../utils/schemas.js';
import { claudeModeModels } from '../utils/thinking.js';
import { promptForSimpleModels } from '../services/prompt.js';
import { AGENT_NAMES, LEGACY_AGENT_NAME } from '../constants.js';

const ANTHROPIC_MODELS = ['haiku', 'sonnet', 'opus', 'fable', 'best', 'opusplan'] as const;

const DEFAULT_MODELS = {
  default_model: 'opusplan',
  sentinel: 'haiku',
  oracle: 'opus',
  architect: 'opus',
  keymaker: 'haiku',
} as const;

const CLAUDE_AI_OPT_OUTS = {
  disableClaudeAiConnectors: true,
  syncClaudeAiSkills: false,
  syncClaudeAiPlugins: false,
} as const;

type OptionalBuiltin = typeof CLAUDE_OPTIONAL_BUILTINS[number];

// What Atelier writes to disable a Claude Code built-in. Every part is removed again only while it
// still matches, so settings the user changed afterwards are left alone.
interface BuiltinPatch {
  settings?: Record<string, unknown>;
  env?: Record<string, string>;
  deny?: string[];
  deniedMcpServers?: string[];
  skillOverrides?: string[];
}

// Built-ins that clash with Atelier skills or cannot work without the bundled skills disabled here.
const CONFLICTING_BUILTINS: BuiltinPatch = {
  settings: { disableBundledSkills: true, enableArtifact: false, disableWorkflows: true },
  deny: ['Artifact', 'ArtifactComments', 'ArtifactData', 'Workflow', 'DesignSync'],
  // Built-in commands stay typable under disableBundledSkills; code-review is left alone as it now resolves to Atelier's skill.
  skillOverrides: ['security-review', 'ultrareview'],
};

const OPTIONAL_BUILTINS: Record<OptionalBuiltin, BuiltinPatch> = {
  cron: { env: { CLAUDE_CODE_DISABLE_CRON: '1' } },
  chrome: { deniedMcpServers: ['claude-in-chrome'] },
  'remote-trigger': { deny: ['RemoteTrigger'] },
};

export const claudeAdapter: HarnessAdapter = {
  name: 'claude',
  configSchema: ClaudeConfigSchema,
  defaultSection,
  modelsForProvider,
  promptSection,
  installAgents,
  mergeHarnessConfig,
  fileList,
  remove,
};

function defaultSection(): ClaudeConfig {
  return {
    provider: 'anthropic',
    default_model: DEFAULT_MODELS.default_model,
    build_thinking: 'high',
    plan_thinking: 'high',
    agents: AGENT_NAMES.map(name => ({
      template: name,
      name,
      model: DEFAULT_MODELS[name],
      thinking: name === 'sentinel' || name === 'keymaker' ? 'default' : name === 'oracle' ? 'xhigh' : 'high',
    })),
  };
}

function modelsForProvider(_provider?: Provider): readonly string[] {
  return [...ANTHROPIC_MODELS];
}

async function promptSection(prompt: typeof inquirer, section: HarnessSection): Promise<HarnessSection> {
  const claude = section as ClaudeConfig;
  const result = await promptForSimpleModels(prompt, claude, modelsForProvider());
  const { disabled } = await prompt.prompt<{ disabled: OptionalBuiltin[] }>([{
    type: 'checkbox',
    name: 'disabled',
    message: 'Disable optional Claude Code built-ins',
    choices: CLAUDE_OPTIONAL_BUILTINS.map(value => ({ name: value, value, checked: claude.disabled_builtins?.includes(value) ?? false })),
  }]);
  return { ...result, disabled_builtins: disabled };
}

function installAgents(section: HarnessSection, basePath: string): void {
  const config = ClaudeConfigSchema.parse(section);
  const agentsDir = join(basePath, '.claude', 'agents');

  try {
    mkdirSync(agentsDir, { recursive: true });
  } catch (err) {
    throw new FileWriteError(agentsDir, err instanceof Error ? err.message : String(err));
  }
  rmSync(join(agentsDir, `${LEGACY_AGENT_NAME}.md`), { force: true });

  for (const agent of config.agents) {
    const template = readTemplate(agent.template);
    const effort = agent.thinking && agent.thinking !== 'default' ? `effort: ${agent.thinking}\n` : '';
    const frontmatter = `---\nname: ${agent.name}\ndescription: ${template.description}\nmodel: ${JSON.stringify(agent.model)}\n${effort}---\n`;
    const content = frontmatter + template.body;

    const agentPath = join(agentsDir, `${agent.name}.md`);
    writeFileSync(agentPath, content);
    console.log(`Created ${shortPath(agentPath)}`);
  }
}

function mergeHarnessConfig(section: HarnessSection, basePath: string): void {
  const config = ClaudeConfigSchema.parse(section);
  const claudeDir = join(basePath, '.claude');
  const settingsPath = join(claudeDir, 'settings.json');
  const existing = readExistingSettings(settingsPath);
  const isNew = Object.keys(existing).length === 0;

  const settings: ExistingSettings = {
    ...existing,
    $schema: 'https://json.schemastore.org/claude-code-settings.json',
    ...CLAUDE_AI_OPT_OUTS,
    model: config.default_model || DEFAULT_MODELS.default_model,
  };
  applyModeThinking(settings, config);
  applyBuiltins(settings, CONFLICTING_BUILTINS);
  for (const name of CLAUDE_OPTIONAL_BUILTINS) {
    if (config.disabled_builtins?.includes(name)) applyBuiltins(settings, OPTIONAL_BUILTINS[name]);
    else removeBuiltins(settings, OPTIONAL_BUILTINS[name]);
  }

  try {
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  } catch (err) {
    throw new FileWriteError(settingsPath, err instanceof Error ? err.message : String(err));
  }
  console.log(`${isNew ? 'Created' : 'Updated'} ${shortPath(settingsPath)}`);
}

function fileList(basePath: string): FileEntry[] {
  const files: FileEntry[] = [
    { path: join(basePath, '.claude', 'settings.json'), exists: existsSync(join(basePath, '.claude', 'settings.json')) },
  ];
  for (const name of AGENT_NAMES) {
    const path = join(basePath, '.claude', 'agents', `${name}.md`);
    files.push({ path, exists: existsSync(path) });
  }
  return files;
}

function remove(section: HarnessSection, basePath: string): void {
  const config = section as ClaudeConfig;
  const claudeDir = join(basePath, '.claude');
  const agentsDir = join(claudeDir, 'agents');

  for (const agent of config.agents) {
    const file = join(agentsDir, `${agent.name}.md`);
    if (existsSync(file)) {
      rmSync(file, { force: true });
    }
  }
  rmSync(join(agentsDir, `${LEGACY_AGENT_NAME}.md`), { force: true });

  removeDirIfEmpty(agentsDir);
  removeAtelierSettings(claudeDir, config);
}

function removeDirIfEmpty(dir: string): void {
  if (!existsSync(dir)) {
    return;
  }
  try {
    if (readdirSync(dir).length === 0) {
      rmdirSync(dir);
    }
  } catch (err) {
    throw new FileWriteError(dir, err instanceof Error ? err.message : String(err));
  }
}

function removeAtelierSettings(claudeDir: string, config: ClaudeConfig): void {
  const settingsPath = join(claudeDir, 'settings.json');
  if (!existsSync(settingsPath)) {
    return;
  }

  const content = parseSettingsJson(settingsPath);
  delete content.$schema;
  delete content.model;
  for (const [key, value] of Object.entries(CLAUDE_AI_OPT_OUTS)) {
    if (content[key] === value) delete content[key];
  }
  applyModeThinking(content, config, true);
  removeBuiltins(content, CONFLICTING_BUILTINS);
  for (const patch of Object.values(OPTIONAL_BUILTINS)) removeBuiltins(content, patch);
  writeOrDeleteSettings(settingsPath, content);
}

function applyModeThinking(settings: Record<string, unknown>, config: ClaudeConfig, remove = false): void {
  const models = claudeModeModels(config.default_model);
  const modelSettings = { ...(settings.modelSettings as Record<string, Record<string, unknown>> | undefined) };
  for (const mode of ['build', 'plan'] as const) {
    const thinking = config[`${mode}_thinking`];
    if (thinking === undefined) continue;
    const entry = { ...modelSettings[models[mode]] };
    if (remove || thinking === 'default') delete entry.effortLevel;
    else entry.effortLevel = thinking;
    if (Object.keys(entry).length) modelSettings[models[mode]] = entry;
    else delete modelSettings[models[mode]];
  }
  if (Object.keys(modelSettings).length) settings.modelSettings = modelSettings;
  else delete settings.modelSettings;
}

function applyBuiltins(settings: Record<string, unknown>, patch: BuiltinPatch): void {
  Object.assign(settings, patch.settings);
  if (patch.env) settings.env = { ...(settings.env as Record<string, string> | undefined), ...patch.env };
  if (patch.deny) {
    const permissions = { ...(settings.permissions as Record<string, unknown> | undefined) };
    const deny = (permissions.deny as string[] | undefined) ?? [];
    permissions.deny = [...deny, ...patch.deny.filter(rule => !deny.includes(rule))];
    settings.permissions = permissions;
  }
  if (patch.skillOverrides) {
    const overrides = { ...(settings.skillOverrides as Record<string, string> | undefined) };
    for (const name of patch.skillOverrides) overrides[name] = 'off';
    settings.skillOverrides = overrides;
  }
  if (patch.deniedMcpServers) {
    const denied = (settings.deniedMcpServers as { serverName?: string }[] | undefined) ?? [];
    const missing = patch.deniedMcpServers.filter(name => !denied.some(entry => entry.serverName === name));
    settings.deniedMcpServers = [...denied, ...missing.map(serverName => ({ serverName }))];
  }
}

function removeBuiltins(settings: Record<string, unknown>, patch: BuiltinPatch): void {
  for (const [key, value] of Object.entries(patch.settings ?? {})) {
    if (settings[key] === value) delete settings[key];
  }
  if (patch.env) {
    const env = { ...(settings.env as Record<string, string> | undefined) };
    for (const [key, value] of Object.entries(patch.env)) {
      if (env[key] === value) delete env[key];
    }
    if (Object.keys(env).length) settings.env = env;
    else delete settings.env;
  }
  if (patch.deny && settings.permissions) {
    const permissions = { ...(settings.permissions as Record<string, unknown>) };
    const deny = ((permissions.deny as string[] | undefined) ?? []).filter(rule => !patch.deny!.includes(rule));
    if (deny.length) permissions.deny = deny;
    else delete permissions.deny;
    if (Object.keys(permissions).length) settings.permissions = permissions;
    else delete settings.permissions;
  }
  if (patch.skillOverrides && settings.skillOverrides) {
    const overrides = { ...(settings.skillOverrides as Record<string, string>) };
    for (const name of patch.skillOverrides) {
      if (overrides[name] === 'off') delete overrides[name];
    }
    if (Object.keys(overrides).length) settings.skillOverrides = overrides;
    else delete settings.skillOverrides;
  }
  if (patch.deniedMcpServers && settings.deniedMcpServers) {
    const denied = (settings.deniedMcpServers as { serverName?: string }[]).filter(
      entry => !patch.deniedMcpServers!.includes(entry.serverName ?? ''),
    );
    if (denied.length) settings.deniedMcpServers = denied;
    else delete settings.deniedMcpServers;
  }
}

function parseSettingsJson(settingsPath: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(settingsPath, 'utf-8')) as Record<string, unknown>;
  } catch (err) {
    throw new HarnessConfigError(settingsPath, err instanceof Error ? err.message : String(err));
  }
}

function writeOrDeleteSettings(settingsPath: string, content: Record<string, unknown>): void {
  try {
    if (Object.keys(content).length === 0) {
      rmSync(settingsPath, { force: true });
    } else {
      writeFileSync(settingsPath, JSON.stringify(content, null, 2) + '\n');
    }
  } catch (err) {
    throw new FileWriteError(settingsPath, err instanceof Error ? err.message : String(err));
  }
}

function readExistingSettings(settingsPath: string): ExistingSettings {
  if (!existsSync(settingsPath)) {
    return {};
  }
  try {
    const content = readFileSync(settingsPath, 'utf-8');
    return JSON.parse(content) as ExistingSettings;
  } catch (err) {
    throw new HarnessConfigError(settingsPath, err instanceof Error ? err.message : String(err));
  }
}

interface ExistingSettings {
  model?: string;
  [key: string]: unknown;
}
