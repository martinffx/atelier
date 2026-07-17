import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { readTemplate } from '../utils/templates.js';
import type { OpenCodeConfig, OpenCodeProvider, SharedConfig } from '../types.js';
import { FileWriteError, HarnessConfigError } from '../utils/errors.js';
import matter from 'gray-matter';

export type OpenCodeGeneratorConfig = OpenCodeConfig & SharedConfig;

export function getGlobalOpencodeDir(): string {
  return join(homedir(), '.config', 'opencode');
}

function isGlobalOpencode(basePath: string): boolean {
  return basePath === getGlobalOpencodeDir();
}

export function getOpencodeRoot(basePath: string): string {
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

export function generateOpenCode(config: OpenCodeGeneratorConfig, basePath: string): void {
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

export function removeOpenCodeArtifacts(config: OpenCodeGeneratorConfig, basePath: string): void {
  const opencodeRoot = getOpencodeRoot(basePath);

  for (const agent of config.agents) {
    const file = join(opencodeRoot, 'agent', `${agent.name}.md`);
    if (existsSync(file)) {
      rmSync(file, { force: true });
    }
  }

  const pluginPath = join(opencodeRoot, 'plugins/atelier.js');
  if (existsSync(pluginPath)) {
    rmSync(pluginPath, { force: true });
  }

  const commandsDir = join(opencodeRoot, 'command');
  if (existsSync(commandsDir)) {
    for (const commandName of getUserInvocableSkillNames(config.skills_path)) {
      const commandPath = join(commandsDir, `${commandName}.md`);
      if (existsSync(commandPath)) {
        rmSync(commandPath, { force: true });
      }
    }
  }

  const opencodeJsonPath = join(basePath, 'opencode.json');
  if (!existsSync(opencodeJsonPath)) {
    return;
  }

  let content: Record<string, unknown>;
  try {
    content = JSON.parse(readFileSync(opencodeJsonPath, 'utf-8')) as Record<string, unknown>;
  } catch (err) {
    throw new HarnessConfigError(opencodeJsonPath, err instanceof Error ? err.message : String(err));
  }

  if (content.agent && typeof content.agent === 'object' && !Array.isArray(content.agent)) {
    const agent = content.agent as Record<string, unknown>;
    delete agent.build;
    delete agent.plan;
    if (Object.keys(agent).length === 0) {
      delete content.agent;
    }
  }

  if (config.provider === 'amazon-bedrock' && content.provider && typeof content.provider === 'object' && !Array.isArray(content.provider)) {
    const provider = content.provider as Record<string, unknown>;
    delete provider['amazon-bedrock'];
    if (Object.keys(provider).length === 0) {
      delete content.provider;
    }
  }

  if (Object.keys(content).length === 0) {
    rmSync(opencodeJsonPath, { force: true });
  } else {
    writeFileSync(opencodeJsonPath, JSON.stringify(content, null, 2) + '\n');
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

function getUserInvocableSkillNames(skillsPath: string): string[] {
  const resolved = resolveSkillsPath(skillsPath);
  if (!resolved || !existsSync(resolved)) {
    return [];
  }

  let entries: string[];
  try {
    entries = readdirSync(resolved, { encoding: 'utf-8' });
  } catch {
    return [];
  }

  const names: string[] = [];
  for (const entry of entries) {
    const skillMdPath = join(resolved, entry, 'SKILL.md');
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
    if (fm['user-invocable'] === true) {
      names.push(entry);
    }
  }

  return names;
}

function writeCommandFiles(config: OpenCodeGeneratorConfig, basePath: string): void {
  const opencodeRoot = getOpencodeRoot(basePath);
  const commandsDir = join(opencodeRoot, 'command');

  try {
    mkdirSync(commandsDir, { recursive: true });
  } catch (err) {
    throw new FileWriteError(commandsDir, err instanceof Error ? err.message : String(err));
  }

  for (const commandName of getUserInvocableSkillNames(config.skills_path)) {
    const description = getSkillDescription(config.skills_path, commandName) || `Activate the ${commandName} skill`;

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

function getSkillDescription(skillsPath: string, skillName: string): string | undefined {
  const resolved = resolveSkillsPath(skillsPath);
  if (!resolved) {
    return undefined;
  }

  const skillMdPath = join(resolved, skillName, 'SKILL.md');
  if (!existsSync(skillMdPath)) {
    return undefined;
  }

  try {
    const skillContent = readFileSync(skillMdPath, { encoding: 'utf-8' });
    const { data } = matter(skillContent);
    const fm = data as SkillFrontmatter;
    return fm.description;
  } catch {
    return undefined;
  }
}

export function resolveSkillsPath(skillsPath: string): string | null {
  if (skillsPath.startsWith('~/')) {
    return join(homedir(), skillsPath.slice(2));
  }
  if (skillsPath.startsWith('/')) {
    return skillsPath;
  }
  return join(process.cwd(), skillsPath);
}
