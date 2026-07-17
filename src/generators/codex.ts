import { writeFileSync, mkdirSync, readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import * as TOML from 'smol-toml';
import type { CodexConfig, SharedConfig } from '../types.js';
import { readTemplate } from '../utils/templates.js';
import { FileWriteError, HarnessConfigError } from '../utils/errors.js';

export type CodexGeneratorConfig = CodexConfig & SharedConfig;

export function generateCodex(config: CodexGeneratorConfig, basePath: string): void {
  const codexDir = join(basePath, '.codex');
  const agentsDir = join(codexDir, 'agents');

  try {
    mkdirSync(agentsDir, { recursive: true });
  } catch (err) {
    throw new FileWriteError(agentsDir, err instanceof Error ? err.message : String(err));
  }

  try {
    writeConfigToml(config, codexDir);
    writeAgentFiles(config, agentsDir);
  } catch (err) {
    throw new FileWriteError(codexDir, err instanceof Error ? err.message : String(err));
  }
}

export function removeCodexArtifacts(config: CodexConfig, basePath: string): void {
  const codexDir = join(basePath, '.codex');
  const agentsDir = join(codexDir, 'agents');

  for (const agent of config.agents) {
    const file = join(agentsDir, `${agent.name}.toml`);
    if (existsSync(file)) {
      rmSync(file, { force: true });
    }
  }

  if (existsSync(agentsDir)) {
    rmSync(agentsDir, { recursive: true, force: true });
  }

  const configPath = join(codexDir, 'config.toml');
  if (!existsSync(configPath)) {
    return;
  }

  let content: Record<string, unknown>;
  try {
    content = TOML.parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
  } catch (err) {
    throw new HarnessConfigError(configPath, err instanceof Error ? err.message : String(err));
  }

  delete content.model;
  delete content.model_reasoning_effort;

  if (content.features && isObject(content.features)) {
    delete (content.features as Record<string, unknown>).multi_agent;
    if (Object.keys(content.features).length === 0) {
      delete content.features;
    }
  }

  if (content.agents && isObject(content.agents)) {
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
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function writeConfigToml(config: CodexGeneratorConfig, codexDir: string): void {
  const configPath = join(codexDir, 'config.toml');
  let existing: Record<string, unknown> = {};

  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8');
      existing = TOML.parse(content) as Record<string, unknown>;
    } catch (err) {
      throw new FileWriteError(configPath, err instanceof Error ? err.message : String(err));
    }
  }

  const merged = {
    ...existing,
    model: config.default_model,
    model_reasoning_effort: 'medium',
    features: {
      ...(isObject(existing.features) ? (existing.features as Record<string, unknown>) : {}),
      multi_agent: true,
    },
    agents: {
      ...(isObject(existing.agents) ? (existing.agents as Record<string, unknown>) : {}),
      max_threads: 6,
      max_depth: 1,
    },
  };

  writeFileSync(configPath, TOML.stringify(merged));
  console.log('Updated .codex/config.toml');
}

function writeAgentFiles(config: CodexGeneratorConfig, agentsDir: string): void {
  for (const agent of config.agents) {
    const template = readTemplate(agent.template);
    const content = {
      name: agent.name,
      description: template.description,
      model: agent.model,
      model_reasoning_effort: 'medium',
      sandbox_mode: 'read-only',
      developer_instructions: template.body,
    };

    const agentPath = join(agentsDir, `${agent.name}.toml`);
    writeFileSync(agentPath, TOML.stringify(content));
    console.log(`Created .codex/agents/${agent.name}.toml`);
  }
}
