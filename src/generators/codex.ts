import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as TOML from 'smol-toml';
import type { AtelierConfig, CodexConfig } from '../types.js';
import { readTemplate } from '../utils/templates.js';
import { FileWriteError } from '../utils/errors.js';

type CodexGeneratorConfig = CodexConfig & Pick<AtelierConfig, 'version' | 'skills_source' | 'skills_path'>;

export function generateCodex(config: CodexGeneratorConfig, basePath = process.cwd()): void {
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
    throw new FileWriteError('generateCodex', err instanceof Error ? err.message : String(err));
  }
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
      ...(typeof existing.features === 'object' && existing.features !== null
        ? (existing.features as Record<string, unknown>)
        : {}),
      multi_agent: true,
    },
    agents: {
      ...(typeof existing.agents === 'object' && existing.agents !== null
        ? (existing.agents as Record<string, unknown>)
        : {}),
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
