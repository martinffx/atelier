import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { readTemplate } from '../utils/templates.js';
import type { AtelierConfig, OpenCodeConfig } from '../types.js';

type OpenCodeGeneratorConfig = OpenCodeConfig & Pick<AtelierConfig, 'version' | 'skills_source' | 'skills_path'>;
import { FileWriteError } from '../utils/errors.js';
import matter from 'gray-matter';

export function getGlobalOpencodeDir(): string {
  return join(homedir(), '.config', 'opencode');
}

function isGlobalOpencode(basePath: string): boolean {
  return basePath === getGlobalOpencodeDir();
}

function getOpencodeRoot(basePath: string): string {
  return isGlobalOpencode(basePath) ? basePath : join(basePath, '.opencode');
}

function displayPath(basePath: string, relativePath: string): string {
  const home = homedir();
  const fullPath = join(basePath, relativePath);
  if (fullPath === home || fullPath.startsWith(home + '/')) {
    return '~' + fullPath.slice(home.length);
  }
  return relativePath;
}

export function generateOpenCode(config: OpenCodeGeneratorConfig, basePath = process.cwd()): void {
  const opencodeRoot = getOpencodeRoot(basePath);
  const agentsDir = join(opencodeRoot, 'agent');
  const pluginsDir = join(opencodeRoot, 'plugins');

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

function writeOpenCodeJson(config: OpenCodeGeneratorConfig, basePath: string): void {
  const opencodeJsonPath = join(basePath, 'opencode.json');
  const existing = readExistingOpenCodeJson(opencodeJsonPath);
  const isNew = Object.keys(existing).length === 0;

  const recon = config.agents.find(a => a.name === 'recon');
  const architect = config.agents.find(a => a.name === 'architect');

  const atelierFields: Record<string, unknown> = {
    agent: {
      build: {
        mode: 'primary',
        model: config.build_model || recon?.model || 'opencode/deepseek-v4-flash',
      },
      plan: {
        mode: 'primary',
        model: config.plan_model || architect?.model || 'opencode/deepseek-v4-pro',
      },
    },
  };

  // Add provider-specific config for Amazon Bedrock
  if (config.provider === 'amazon-bedrock') {
    atelierFields.provider = {
      'amazon-bedrock': {
        options: {
          region: 'us-east-1',
        },
      },
    };
  }

  const merged = deepMerge(existing, atelierFields);

  writeFileSync(opencodeJsonPath, JSON.stringify(merged, null, 2) + '\n');
  console.log(`${isNew ? 'Created' : 'Updated'} ${displayPath(basePath, 'opencode.json')}`);
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

function writePluginJs(config: OpenCodeGeneratorConfig, basePath: string): void {
  const skillsDir = config.skills_path || '~/.agents/skills';

  const plugin = `export default {
  config: {
    skillsDir: ${JSON.stringify(skillsDir)},
  },
  'experimental.chat.system.transform': (systemPrompt) => {
    return systemPrompt;
  },
};
`;

  const opencodeRoot = getOpencodeRoot(basePath);
  const pluginPath = join(opencodeRoot, 'plugins/atelier.js');
  writeFileSync(pluginPath, plugin);
  console.log(`Created ${displayPath(basePath, isGlobalOpencode(basePath) ? 'plugins/atelier.js' : '.opencode/plugins/atelier.js')}`);
}

function writeAgentFiles(config: OpenCodeGeneratorConfig, basePath: string): void {
  const opencodeRoot = getOpencodeRoot(basePath);
  const agentsDir = join(opencodeRoot, 'agent');

  for (const agent of config.agents) {
    const template = readTemplate(agent.template);
    const frontmatter = `---\nname: ${agent.name}\ndescription: ${template.description}\nmode: subagent\nmodel: ${agent.model}\ntemperature: 0.2\n---\n`;
    const content = frontmatter + template.body;

    const agentPath = join(agentsDir, `${agent.name}.md`);
    writeFileSync(agentPath, content);
    console.log(`Created ${displayPath(basePath, isGlobalOpencode(basePath) ? `agent/${agent.name}.md` : `.opencode/agent/${agent.name}.md`)}`);
  }
}

interface SkillFrontmatter {
  name?: string;
  description?: string;
  'user-invocable'?: boolean;
}

function writeCommandFiles(config: OpenCodeGeneratorConfig, basePath: string): void {
  const opencodeRoot = getOpencodeRoot(basePath);
  const commandsDir = join(opencodeRoot, 'command');

  try {
    mkdirSync(commandsDir, { recursive: true });
  } catch (err) {
    throw new FileWriteError(commandsDir, err instanceof Error ? err.message : String(err));
  }

  let skillsDir = config.skills_path || '~/.agents/skills';
  if (skillsDir.startsWith('~/')) {
    skillsDir = join(homedir(), skillsDir.slice(2));
  } else if (!skillsDir.startsWith('/')) {
    skillsDir = join(process.cwd(), skillsDir);
  }

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

    const commandPath = join(commandsDir, `${commandName}.md`);
    writeFileSync(commandPath, commandContent);
    console.log(`Created ${displayPath(basePath, isGlobalOpencode(basePath) ? `command/${commandName}.md` : `.opencode/command/${commandName}.md`)}`);
  }
}
