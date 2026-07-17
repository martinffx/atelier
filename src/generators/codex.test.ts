import { describe, test, expect, afterEach, beforeEach } from 'bun:test';
import { mkdtempSync, rmSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as TOML from 'smol-toml';

let tempDir: string;

const testConfig = {
  version: '1.0.0' as const,
  skills_source: 'martinffx/atelier',
  skills_path: '~/.agents/skills',
  default_model: 'gpt-5.6-terra',
  agents: [
    { template: 'recon', name: 'recon', model: 'gpt-5.6-luna' },
    { template: 'oracle', name: 'oracle', model: 'gpt-5.6-sol' },
    { template: 'architect', name: 'architect', model: 'gpt-5.6-sol' },
  ],
};

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'atelier-codex-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('generateCodex', () => {
  test('creates .codex directory structure', async () => {
    const { generateCodex } = await import('./codex.js');
    generateCodex(testConfig, tempDir);

    expect(statSync(join(tempDir, '.codex')).isDirectory()).toBe(true);
    expect(statSync(join(tempDir, '.codex/agents')).isDirectory()).toBe(true);
  });

  test('writes config.toml with required keys', async () => {
    const { generateCodex } = await import('./codex.js');
    generateCodex(testConfig, tempDir);

    const configPath = join(tempDir, '.codex/config.toml');
    const config = TOML.parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>;

    expect(config.model).toBe('gpt-5.6-terra');
    expect(config.model_reasoning_effort).toBe('medium');
    expect((config.features as Record<string, unknown>).multi_agent).toBe(true);
    expect((config.agents as Record<string, unknown>).max_threads).toBe(6);
    expect((config.agents as Record<string, unknown>).max_depth).toBe(1);
  });

  test('preserves existing config.toml keys when merging', async () => {
    const { generateCodex } = await import('./codex.js');

    mkdirSync(join(tempDir, '.codex'), { recursive: true });
    writeFileSync(
      join(tempDir, '.codex/config.toml'),
      TOML.stringify({
        customField: 'preserved',
        features: { existingFeature: true },
        agents: { existingAgent: 'value' },
      })
    );

    generateCodex(testConfig, tempDir);

    const configPath = join(tempDir, '.codex/config.toml');
    const config = TOML.parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>;

    expect(config.customField).toBe('preserved');
    expect((config.features as Record<string, unknown>).existingFeature).toBe(true);
    expect((config.agents as Record<string, unknown>).existingAgent).toBe('value');
    expect(config.model).toBe('gpt-5.6-terra');
    expect((config.features as Record<string, unknown>).multi_agent).toBe(true);
    expect((config.agents as Record<string, unknown>).max_threads).toBe(6);
    expect((config.agents as Record<string, unknown>).max_depth).toBe(1);
  });

  test('writes agent TOML files with required fields', async () => {
    const { generateCodex } = await import('./codex.js');
    generateCodex(testConfig, tempDir);

    for (const name of ['recon', 'oracle', 'architect']) {
      const agentPath = join(tempDir, '.codex/agents', `${name}.toml`);
      const content = TOML.parse(readFileSync(agentPath, 'utf-8')) as Record<string, unknown>;

      expect(content.name).toBe(name);
      expect(typeof content.description).toBe('string');
      expect(typeof content.model).toBe('string');
      expect(content.model_reasoning_effort).toBe('medium');
      expect(content.sandbox_mode).toBe('read-only');
      expect(typeof content.developer_instructions).toBe('string');
    }
  });

  test('sets agent models from config', async () => {
    const { generateCodex } = await import('./codex.js');
    generateCodex(testConfig, tempDir);

    const recon = TOML.parse(readFileSync(join(tempDir, '.codex/agents/recon.toml'), 'utf-8')) as Record<string, unknown>;
    const oracle = TOML.parse(readFileSync(join(tempDir, '.codex/agents/oracle.toml'), 'utf-8')) as Record<string, unknown>;
    const architect = TOML.parse(readFileSync(join(tempDir, '.codex/agents/architect.toml'), 'utf-8')) as Record<string, unknown>;

    expect(recon.model).toBe('gpt-5.6-luna');
    expect(oracle.model).toBe('gpt-5.6-sol');
    expect(architect.model).toBe('gpt-5.6-sol');
  });

  test('does not corrupt existing array features/agents into numeric-keyed tables', async () => {
    const { generateCodex } = await import('./codex.js');

    mkdirSync(join(tempDir, '.codex'), { recursive: true });
    writeFileSync(
      join(tempDir, '.codex/config.toml'),
      TOML.stringify({
        features: ['some', 'array'],
        agents: ['also', 'array'],
        customField: 'preserved',
      })
    );

    generateCodex(testConfig, tempDir);

    const configPath = join(tempDir, '.codex/config.toml');
    const config = TOML.parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>;

    // Conflicting array values are replaced by the table form; they are not corrupted into numeric keys
    expect(Array.isArray(config.features)).toBe(false);
    expect((config.features as Record<string, unknown>).multi_agent).toBe(true);
    expect(Array.isArray(config.agents)).toBe(false);
    expect((config.agents as Record<string, unknown>).max_threads).toBe(6);
    expect(config.customField).toBe('preserved');
  });
});
