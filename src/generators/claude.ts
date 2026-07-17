import { writeFileSync, mkdirSync, readFileSync, chmodSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { readTemplate } from '../utils/templates.js';
import type { ClaudeConfig, SharedConfig } from '../types.js';

import { FileWriteError, HarnessConfigError } from '../utils/errors.js';

export type ClaudeGeneratorConfig = ClaudeConfig & SharedConfig;

export function generateClaude(config: ClaudeGeneratorConfig, basePath: string): void {
  const claudeDir = join(basePath, '.claude');
  const agentsDir = join(claudeDir, 'agents');
  const hooksDir = join(basePath, 'hooks');

  try {
    mkdirSync(agentsDir, { recursive: true });
    mkdirSync(hooksDir, { recursive: true });
  } catch (err) {
    throw new FileWriteError(agentsDir, err instanceof Error ? err.message : String(err));
  }

  try {
    writeSettingsJson(config, basePath);
    writeHookScript(config, basePath);
    writeAgentFiles(config, basePath);
  } catch (err) {
    throw new FileWriteError(join(basePath, '.claude'), err instanceof Error ? err.message : String(err));
  }
}

export function removeClaudeArtifacts(config: ClaudeConfig, basePath: string): void {
  const claudeDir = join(basePath, '.claude');

  removeAgentFiles(config, claudeDir);
  removeHookScript(basePath);
  removeAtelierSettings(claudeDir);
}

function removeAgentFiles(config: ClaudeConfig, claudeDir: string): void {
  const agentsDir = join(claudeDir, 'agents');

  for (const agent of config.agents) {
    const file = join(agentsDir, `${agent.name}.md`);
    if (existsSync(file)) {
      rmSync(file, { force: true });
    }
  }

  if (existsSync(agentsDir)) {
    rmSync(agentsDir, { recursive: true, force: true });
  }
}

function removeHookScript(basePath: string): void {
  const hookPath = join(basePath, 'hooks/atelier-session-start');
  if (existsSync(hookPath)) {
    rmSync(hookPath, { force: true });
  }
}

function removeAtelierSettings(claudeDir: string): void {
  const settingsPath = join(claudeDir, 'settings.json');
  if (!existsSync(settingsPath)) {
    return;
  }

  const content = parseSettingsJson(settingsPath);
  delete content.$schema;
  delete content.model;
  removeAtelierSessionStartHooks(content);
  writeOrDeleteSettings(settingsPath, content);
}

function parseSettingsJson(settingsPath: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(settingsPath, 'utf-8')) as Record<string, unknown>;
  } catch (err) {
    throw new HarnessConfigError(settingsPath, err instanceof Error ? err.message : String(err));
  }
}

function removeAtelierSessionStartHooks(content: Record<string, unknown>): void {
  if (!content.hooks || typeof content.hooks !== 'object' || Array.isArray(content.hooks)) {
    return;
  }

  const hooks = content.hooks as Record<string, unknown>;
  if (!Array.isArray(hooks.SessionStart)) {
    return;
  }

  const sessionStart = hooks.SessionStart as Array<Record<string, unknown>>;
  const filtered = sessionStart.filter((hook: Record<string, unknown>) => {
    const innerHooks = hook.hooks as Array<Record<string, unknown>> | undefined;
    return !innerHooks?.some((h: Record<string, unknown>) => h.command === 'hooks/atelier-session-start');
  });
  (hooks as Record<string, unknown>).SessionStart = filtered;

  if (hooks.SessionStart.length === 0) {
    delete hooks.SessionStart;
  }
  if (Object.keys(hooks).length === 0) {
    delete content.hooks;
  }
}

function writeOrDeleteSettings(settingsPath: string, content: Record<string, unknown>): void {
  if (Object.keys(content).length === 0) {
    rmSync(settingsPath, { force: true });
  } else {
    writeFileSync(settingsPath, JSON.stringify(content, null, 2) + '\n');
  }
}

function writeSettingsJson(config: ClaudeGeneratorConfig, basePath: string): void {
  const settingsPath = join(basePath, '.claude/settings.json');
  const existing = readExistingSettings(settingsPath);
  const isNew = Object.keys(existing).length === 0;

  const atelierHook: SessionStartHook = {
    hooks: [
      {
        command: 'hooks/atelier-session-start',
        type: 'command',
      },
    ],
    matcher: 'startup|clear|compact',
  };

  const existingSessionStart = existing.hooks?.SessionStart || [];
  const hasAtelierHook = existingSessionStart.some(
    (h) => h.hooks?.some((hook) => hook.command === 'hooks/atelier-session-start')
  );

  const newSessionStart = hasAtelierHook
    ? existingSessionStart
    : [...existingSessionStart, atelierHook];

  const settings: ExistingSettings = {
    ...existing,
    $schema: 'https://json.schemastore.org/claude-code-settings.json',
    model: config.default_model || 'opusplan',
    hooks: {
      ...(existing.hooks || {}),
      SessionStart: newSessionStart,
    },
  };

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  console.log(`${isNew ? 'Created' : 'Updated'} .claude/settings.json`);
}

interface SessionStartHook {
  hooks: { command?: string; type?: string }[];
  matcher?: string;
}

interface ExistingSettings {
  model?: string;
  hooks?: { SessionStart?: SessionStartHook[] };
  [key: string]: unknown;
}

function readExistingSettings(settingsPath: string): ExistingSettings {
  try {
    const content = readFileSync(settingsPath, 'utf-8');
    return JSON.parse(content) as ExistingSettings;
  } catch {
    return {};
  }
}

function escapeShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

function writeHookScript(config: ClaudeGeneratorConfig, basePath: string): void {
  const skillsPath = config.skills_path || '~/.agents/skills';
  const safeSkillsPath = escapeShellArg(skillsPath);

  const script = `#!/bin/bash
# Atelier session-start hook
# Skills path: ${skillsPath}

SKILLS_DIR=${safeSkillsPath}

if [ -d "$SKILLS_DIR" ]; then
  echo '{"additionalContext": {"skillsDir": "'"$SKILLS_DIR"'"}}'
else
  echo '{"additionalContext": {}}'
fi
`;

  const hookPath = join(basePath, 'hooks/atelier-session-start');
  writeFileSync(hookPath, script);
  chmodSync(hookPath, 0o700);
  console.log('Created hooks/atelier-session-start');
}

function writeAgentFiles(config: ClaudeGeneratorConfig, basePath: string): void {
  const agentsDir = join(basePath, '.claude/agents');

  for (const agent of config.agents) {
    const template = readTemplate(agent.template);
    const frontmatter = `---\nname: ${agent.name}\ndescription: ${template.description}\nmodel: ${agent.model}\n---\n`;
    const content = frontmatter + template.body;

    const agentPath = join(agentsDir, `${agent.name}.md`);
    writeFileSync(agentPath, content);
    console.log(`Created .claude/agents/${agent.name}.md`);
  }
}
