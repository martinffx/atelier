import { writeFileSync, mkdirSync, readFileSync, chmodSync } from 'fs';
import { join } from 'path';
import { readTemplate } from '../utils/templates.js';
import type { AtelierConfig } from '../types.js';

const CLAUDE_DIR = '.claude';
const CLAUDE_AGENTS_DIR = '.claude/agents';
const HOOKS_DIR = 'hooks';
const HOOK_SCRIPT = 'hooks/atelier-session-start';

export function generateClaude(config: AtelierConfig): void {
  mkdirSync(CLAUDE_AGENTS_DIR, { recursive: true });
  mkdirSync(HOOKS_DIR, { recursive: true });

  writeSettingsJson(config);
  writeHookScript(config);
  writeAgentFiles(config);
}

function writeSettingsJson(config: AtelierConfig): void {
  const existing = readExistingSettings();

  const settings = {
    ...existing,
    $schema: 'https://json.schemastore.org/claude-code-settings.json',
    model: 'opusplan',
    hooks: {
      SessionStart: [
        {
          hooks: [
            {
              command: 'hooks/atelier-session-start',
              type: 'command',
            },
          ],
          matcher: 'startup|clear|compact',
        },
      ],
    },
  };

  writeFileSync(
    join(CLAUDE_DIR, 'settings.json'),
    JSON.stringify(settings, null, 2) + '\n'
  );
}

function readExistingSettings(): Record<string, unknown> {
  try {
    const content = readFileSync(join(CLAUDE_DIR, 'settings.json'), 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function writeHookScript(config: AtelierConfig): void {
  const skillsPath = config.skills_path || '~/.agents/skills/atelier';

  const script = `#!/bin/bash
# Atelier session-start hook
# Skills path: ${skillsPath}

SKILLS_DIR="${skillsPath}"

if [ -d "$SKILLS_DIR/atelier" ]; then
  echo '{"additionalContext": {"skillsDir": "'"$SKILLS_DIR"'/atelier"}}'
else
  echo '{"additionalContext": {}}'
fi
`;

  writeFileSync(HOOK_SCRIPT, script);
  chmodSync(HOOK_SCRIPT, 0o755);
}

function writeAgentFiles(config: AtelierConfig): void {
  for (const agent of config.agents) {
    const template = readTemplate(agent.template);
    const frontmatter = `---\nname: ${agent.name}\nmodel: ${agent.model}\n---\n`;
    const content = frontmatter + template.body;

    writeFileSync(
      join(CLAUDE_AGENTS_DIR, `${agent.name}.md`),
      content
    );
  }
}