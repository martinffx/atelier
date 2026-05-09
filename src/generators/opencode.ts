import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { readTemplate } from '../utils/templates.js';
import type { AtelierConfig } from '../types.js';

const OPENCODE_DIR = '.opencode';
const OPENCODE_AGENTS_DIR = '.opencode/agents';
const OPENCODE_PLUGINS_DIR = '.opencode/plugins';

export function generateOpenCode(config: AtelierConfig): void {
  mkdirSync(OPENCODE_AGENTS_DIR, { recursive: true });
  mkdirSync(OPENCODE_PLUGINS_DIR, { recursive: true });

  writeOpenCodeJson(config);
  writePluginJs(config);
  writeAgentFiles(config);
}

function writeOpenCodeJson(config: AtelierConfig): void {
  const existing = readExistingOpenCodeJson();

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

  writeFileSync(
    'opencode.json',
    JSON.stringify(merged, null, 2) + '\n'
  );
}

function readExistingOpenCodeJson(): Record<string, unknown> {
  try {
    const content = readFileSync('opencode.json', 'utf-8');
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

function writePluginJs(config: AtelierConfig): void {
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

  writeFileSync(
    join(OPENCODE_PLUGINS_DIR, 'atelier.js'),
    plugin
  );
}

function writeAgentFiles(config: AtelierConfig): void {
  for (const agent of config.agents) {
    const template = readTemplate(agent.template);
    const frontmatter = `---\nname: ${agent.name}\nmodel: ${agent.model}\nmode: subagent\n---\n`;
    const content = frontmatter + template.body;

    writeFileSync(
      join(OPENCODE_AGENTS_DIR, `${agent.name}.md`),
      content
    );
  }
}