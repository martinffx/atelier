import { writeFileSync, mkdirSync, readFileSync, chmodSync } from 'fs';
import { join } from 'path';
import { readTemplate } from '../utils/templates.js';
import type { AtelierConfig, ClaudeConfig } from '../types.js';

import { FileWriteError } from '../utils/errors.js';

type ClaudeGeneratorConfig = ClaudeConfig & Pick<AtelierConfig, 'version' | 'skills_source' | 'skills_path'>;

export function generateClaude(config: ClaudeGeneratorConfig, basePath = process.cwd()): void {
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
    throw new FileWriteError('generateClaude', err instanceof Error ? err.message : String(err));
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
  echo '{"additionalContext": {"skillsDir": "'"$SKILLS_DIR"'}}'
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