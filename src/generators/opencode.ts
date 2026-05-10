import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readTemplate } from '../utils/templates.js';
import type { AtelierConfig } from '../types.js';
import { FileWriteError } from '../utils/errors.js';
import matter from 'gray-matter';

export function generateOpenCode(config: AtelierConfig, basePath = process.cwd()): void {
  const agentsDir = join(basePath, '.opencode/agents');
  const pluginsDir = join(basePath, '.opencode/plugins');

  try {
    mkdirSync(agentsDir, { recursive: true });
    mkdirSync(pluginsDir, { recursive: true });
  } catch (err) {
    throw new FileWriteError(agentsDir, err instanceof Error ? err.message : String(err));
  }

  try {
    writeOpenCodeJson(config, basePath);
    writePluginJs(config, basePath);
    writeAgentFiles(config, basePath);
    writeCommandFiles(config, basePath);
  } catch (err) {
    throw new FileWriteError('generateOpenCode', err instanceof Error ? err.message : String(err));
  }
}

function writeOpenCodeJson(config: AtelierConfig, basePath: string): void {
  const opencodeJsonPath = join(basePath, 'opencode.json');
  const existing = readExistingOpenCodeJson(opencodeJsonPath);

  const atelierFields = {
    agent: {
      build: {
        mode: 'primary',
        model: 'opencode/deepseek-v4-flash',
      },
      plan: {
        mode: 'primary',
        model: 'opencode/deepseek-v4-pro',
      },
    },
  };

  const merged = deepMerge(existing, atelierFields);

  writeFileSync(opencodeJsonPath, JSON.stringify(merged, null, 2) + '\n');
}

function readExistingOpenCodeJson(opencodeJsonPath: string): Record<string, unknown> {
  try {
    const content = readFileSync(opencodeJsonPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      typeof source[key] === 'object' &&
      source[key] !== null &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(
        (result[key] as Record<string, unknown>) || {},
        source[key] as Record<string, unknown>
      );
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function writePluginJs(config: AtelierConfig, basePath: string): void {
  const skillsPath = config.skills_path || '~/.agents/skills/atelier';

  const plugin = `export default {
  config: {
    skillsDir: '${skillsPath}/atelier',
  },
  'experimental.chat.system.transform': (systemPrompt) => {
    return systemPrompt;
  },
};
`;

  const pluginPath = join(basePath, '.opencode/plugins/atelier.js');
  writeFileSync(pluginPath, plugin);
}

function writeAgentFiles(config: AtelierConfig, basePath: string): void {
  const agentsDir = join(basePath, '.opencode/agents');

  for (const agent of config.agents) {
    const template = readTemplate(agent.template);
    const frontmatter = `---\nname: ${agent.name}\nmodel: ${agent.model}\nmode: subagent\n---\n`;
    const content = frontmatter + template.body;

    writeFileSync(join(agentsDir, `${agent.name}.md`), content);
  }
}

interface SkillFrontmatter {
  name?: string;
  description?: string;
  'user-invocable'?: boolean;
}

function writeCommandFiles(config: AtelierConfig, basePath: string): void {
  const commandsDir = join(basePath, '.opencode/commands');

  try {
    mkdirSync(commandsDir, { recursive: true });
  } catch (err) {
    throw new FileWriteError(commandsDir, err instanceof Error ? err.message : String(err));
  }

  let skillsBasePath = config.skills_path || '~/.agents/skills/atelier';
  if (skillsBasePath.startsWith('~/')) {
    const home = dirname(dirname(fileURLToPath(import.meta.url)));
    skillsBasePath = join(home, skillsBasePath.slice(2));
  } else if (!skillsBasePath.startsWith('/')) {
    skillsBasePath = join(process.cwd(), skillsBasePath);
  }

  const skillsDir = join(skillsBasePath, 'atelier');

  if (!existsSync(skillsDir)) {
    return;
  }

  let entries: string[];
  try {
    entries = readdirSync(skillsDir, { encoding: 'utf-8' });
  } catch {
    return;
  }

  for (const entry of entries) {
    const skillMdPath = join(skillsDir, entry, 'SKILL.md');

    if (!existsSync(skillMdPath)) {
      continue;
    }

    let skillContent: string;
    try {
      skillContent = readFileSync(skillMdPath, { encoding: 'utf-8' });
    } catch {
      continue;
    }

    const { data } = matter(skillContent);
    const fm = data as SkillFrontmatter;

    if (fm['user-invocable'] !== true) {
      continue;
    }

    const commandName = entry;
    const description = fm.description || `Activate the ${commandName} skill`;

    const commandContent = `---
description: ${description}
---
Activate the ${commandName} skill and follow its instructions precisely.

User request: $ARGUMENTS
`;

    writeFileSync(join(commandsDir, `${commandName}.md`), commandContent);
  }
}
