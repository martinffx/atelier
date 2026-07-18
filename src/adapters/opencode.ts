import { writeFileSync, mkdirSync, readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import { readTemplate } from '../utils/templates.js';
import type { OpenCodeConfig, SharedConfig, HarnessAdapter, FileEntry, Provider, OpenCodeProvider } from '../types.js';
import { AGENT_NAMES } from '../types.js';
import { FileWriteError, HarnessConfigError } from '../utils/errors.js';
import { shortPath, getGlobalOpencodeDir } from '../services/paths.js';
import { OpenCodeConfigSchema } from '../utils/schemas.js';

const OPENCODE_PROVIDERS: { name: string; value: OpenCodeProvider }[] = [
  { name: 'OpenCode Zen', value: 'opencode-zen' },
  { name: 'OpenCode Go', value: 'opencode-go' },
  { name: 'Amazon Bedrock', value: 'amazon-bedrock' },
];

const PROVIDER_MODELS: Record<OpenCodeProvider, readonly string[]> = {
  'opencode-zen': [
    'opencode/gpt-5.5',
    'opencode/gpt-5.4',
    'opencode/gpt-5.3-codex',
    'opencode/gpt-5.3-codex-spark',
    'opencode/gpt-5.2',
    'opencode/gpt-5.1',
    'opencode/gpt-5',
    'opencode/claude-opus-4-7',
    'opencode/claude-opus-4-6',
    'opencode/claude-sonnet-4-6',
    'opencode/claude-sonnet-4-5',
    'opencode/claude-haiku-4-5',
    'opencode/qwen3.6-plus',
    'opencode/minimax-m2.7',
    'opencode/kimi-k2.6',
    'opencode/glm-5.1',
    'opencode/gemini-3.1-pro',
    'opencode/gemini-3-flash',
  ],
  'opencode-go': [
    'opencode-go/glm-5.1',
    'opencode-go/glm-5',
    'opencode-go/kimi-k2.5',
    'opencode-go/kimi-k2.6',
    'opencode-go/deepseek-v4-pro',
    'opencode-go/deepseek-v4-flash',
    'opencode-go/minimax-m2.7',
    'opencode-go/minimax-m2.5',
    'opencode-go/qwen3.5-plus',
    'opencode-go/qwen3.6-plus',
    'opencode-go/mimo-v2.5',
    'opencode-go/mimo-v2.5-pro',
  ],
  'amazon-bedrock': [
    'amazon-bedrock/anthropic-claude-sonnet-4-5',
    'amazon-bedrock/anthropic-claude-haiku-4-5',
    'amazon-bedrock/anthropic-claude-opus-4-7',
  ],
};

const DEFAULT_MODELS: Record<OpenCodeProvider, { build: string; plan: string; recon: string; oracle: string; architect: string }> = {
  'opencode-zen': {
    recon: 'opencode/minimax-m2.7',
    oracle: 'opencode/kimi-k2.6',
    architect: 'opencode/deepseek-v4-pro',
    build: 'opencode/deepseek-v4-flash',
    plan: 'opencode/deepseek-v4-pro',
  },
  'opencode-go': {
    recon: 'opencode-go/minimax-m2.7',
    oracle: 'opencode-go/kimi-k2.6',
    architect: 'opencode-go/deepseek-v4-pro',
    build: 'opencode-go/deepseek-v4-flash',
    plan: 'opencode-go/deepseek-v4-pro',
  },
  'amazon-bedrock': {
    recon: 'amazon-bedrock/anthropic-claude-haiku-4-5',
    oracle: 'amazon-bedrock/anthropic-claude-opus-4-7',
    architect: 'amazon-bedrock/anthropic-claude-opus-4-7',
    build: 'amazon-bedrock/anthropic-claude-sonnet-4-5',
    plan: 'amazon-bedrock/anthropic-claude-haiku-4-5',
  },
};

export const opencodeAdapter: HarnessAdapter = {
  name: 'opencode',
  providerChoices: OPENCODE_PROVIDERS,
  configSchema: OpenCodeConfigSchema,
  defaultSection,
  modelsForProvider,
  installAgents,
  mergeHarnessConfig,
  fileList,
  remove,
};

function defaultSection(provider?: Provider): OpenCodeConfig {
  const selectedProvider = (provider as OpenCodeProvider) || 'opencode-zen';
  const defaults = DEFAULT_MODELS[selectedProvider];
  return {
    provider: selectedProvider,
    build_model: defaults.build,
    plan_model: defaults.plan,
    agents: AGENT_NAMES.map(name => ({
      template: name,
      name,
      model: defaults[name],
    })),
  };
}

function modelsForProvider(provider?: Provider): readonly string[] {
  const selectedProvider = (provider as OpenCodeProvider) || 'opencode-zen';
  return [...PROVIDER_MODELS[selectedProvider]];
}

function installAgents(_shared: SharedConfig, config: OpenCodeConfig, basePath: string): void {
  const opencodeRoot = getOpencodeRoot(basePath);
  const agentsDir = join(opencodeRoot, 'agent');

  try {
    mkdirSync(agentsDir, { recursive: true });
  } catch (err) {
    throw new FileWriteError(agentsDir, err instanceof Error ? err.message : String(err));
  }

  for (const agent of config.agents) {
    const template = readTemplate(agent.template);
    const frontmatter = `---\nname: ${agent.name}\ndescription: ${template.description}\nmode: subagent\nmodel: ${agent.model}\ntemperature: 0.2\n---\n`;
    const content = frontmatter + template.body;

    const agentPath = join(agentsDir, `${agent.name}.md`);
    writeFileSync(agentPath, content);
    console.log(`Created ${shortPath(agentPath)}`);
  }
}

function mergeHarnessConfig(_shared: SharedConfig, config: OpenCodeConfig, basePath: string): void {
  const opencodeJsonPath = join(basePath, 'opencode.json');
  const existing = readExistingOpenCodeJson(opencodeJsonPath);
  const isNew = Object.keys(existing).length === 0;

  try {
    mkdirSync(basePath, { recursive: true });
  } catch (err) {
    throw new FileWriteError(basePath, err instanceof Error ? err.message : String(err));
  }

  const recon = config.agents.find(a => a.name === 'recon');
  const architect = config.agents.find(a => a.name === 'architect');

  const atelierFields: Record<string, unknown> = {
    agent: {
      build: {
        mode: 'primary',
        model: config.build_model || recon?.model || DEFAULT_MODELS[config.provider].build,
      },
      plan: {
        mode: 'primary',
        model: config.plan_model || architect?.model || DEFAULT_MODELS[config.provider].plan,
      },
    },
  };

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

  try {
    writeFileSync(opencodeJsonPath, JSON.stringify(merged, null, 2) + '\n');
  } catch (err) {
    throw new FileWriteError(opencodeJsonPath, err instanceof Error ? err.message : String(err));
  }
  console.log(`${isNew ? 'Created' : 'Updated'} ${shortPath(opencodeJsonPath)}`);
}

function fileList(basePath: string): FileEntry[] {
  const files: FileEntry[] = [
    { path: join(basePath, 'opencode.json'), exists: existsSync(join(basePath, 'opencode.json')) },
  ];
  const opencodeRoot = getOpencodeRoot(basePath);
  for (const name of AGENT_NAMES) {
    const path = join(opencodeRoot, 'agent', `${name}.md`);
    files.push({ path, exists: existsSync(path) });
  }
  return files;
}

function remove(_shared: SharedConfig, config: OpenCodeConfig, basePath: string): void {
  const opencodeRoot = getOpencodeRoot(basePath);

  for (const agent of config.agents) {
    const file = join(opencodeRoot, 'agent', `${agent.name}.md`);
    if (existsSync(file)) {
      rmSync(file, { force: true });
    }
  }

  const agentsDir = join(opencodeRoot, 'agent');
  if (existsSync(agentsDir)) {
    rmSync(agentsDir, { recursive: true, force: true });
  }

  // Legacy cleanup: remove plugin and command files from older installs.
  const pluginPath = join(opencodeRoot, 'plugins', 'atelier.js');
  if (existsSync(pluginPath)) {
    rmSync(pluginPath, { force: true });
  }

  const commandsDir = join(opencodeRoot, 'command');
  if (existsSync(commandsDir)) {
    rmSync(commandsDir, { recursive: true, force: true });
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

export function getOpencodeRoot(basePath: string): string {
  return basePath === getGlobalOpencodeDir() ? basePath : join(basePath, '.opencode');
}

function readExistingOpenCodeJson(opencodeJsonPath: string): Record<string, unknown> {
  try {
    const content = readFileSync(opencodeJsonPath, 'utf-8');
    return JSON.parse(content) as Record<string, unknown>;
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
