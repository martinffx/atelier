import { describe, it, expect, beforeEach } from 'bun:test';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as TOML from 'smol-toml';
import { codexAdapter } from './codex.js';

const section = () => codexAdapter.defaultSection();

describe('codex adapter', () => {
  let basePath: string;

  beforeEach(() => {
    basePath = mkdtempSync(join(tmpdir(), 'atelier-codex-'));
  });

  it('defaultSection returns openai defaults', () => {
    const section = codexAdapter.defaultSection();
    expect(section.provider).toBe('openai');
    expect(section.default_model).toBe('gpt-5.6-terra');
    expect(section.agents.map(a => a.model)).toEqual(['gpt-5.6-luna', 'gpt-5.6-sol', 'gpt-5.6-sol']);
  });

  it('modelsForProvider returns openai models', () => {
    expect(codexAdapter.modelsForProvider()).toContain('gpt-5.6-sol');
  });

  it('mergeHarnessConfig writes config.toml', () => {
    codexAdapter.mergeHarnessConfig(section(), basePath);
    const path = join(basePath, '.codex', 'config.toml');
    expect(existsSync(path)).toBe(true);
    const content = TOML.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>;
    expect(content.model).toBe('gpt-5.6-terra');
    expect((content.features as Record<string, unknown>).multi_agent).toBe(true);
  });

  it('mergeHarnessConfig preserves custom keys', () => {
    const codexDir = join(basePath, '.codex');
    mkdirSync(codexDir, { recursive: true });
    writeFileSync(join(codexDir, 'config.toml'), TOML.stringify({ custom: 'value' }));
    codexAdapter.mergeHarnessConfig(section(), basePath);
    const content = TOML.parse(readFileSync(join(codexDir, 'config.toml'), 'utf-8')) as Record<string, unknown>;
    expect(content.custom).toBe('value');
    expect(content.model).toBe('gpt-5.6-terra');
  });

  it('mergeHarnessConfig throws on malformed config.toml', () => {
    const codexDir = join(basePath, '.codex');
    mkdirSync(codexDir, { recursive: true });
    writeFileSync(join(codexDir, 'config.toml'), 'not valid toml');

    expect(() => codexAdapter.mergeHarnessConfig(section(), basePath)).toThrow();
  });

  it('installAgents writes agent toml files', () => {
    codexAdapter.installAgents(section(), basePath);
    for (const name of ['recon', 'oracle', 'architect']) {
      const path = join(basePath, '.codex', 'agents', `${name}.toml`);
      expect(existsSync(path)).toBe(true);
      const content = TOML.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>;
      expect(content.name).toBe(name);
      expect(content.sandbox_mode).toBe('read-only');
    }
  });

  it('fileList reports managed files', () => {
    codexAdapter.mergeHarnessConfig(section(), basePath);
    codexAdapter.installAgents(section(), basePath);
    const files = codexAdapter.fileList(basePath);
    expect(files.map(f => f.path)).toEqual([
      join(basePath, '.codex', 'config.toml'),
      join(basePath, '.codex', 'agents', 'recon.toml'),
      join(basePath, '.codex', 'agents', 'oracle.toml'),
      join(basePath, '.codex', 'agents', 'architect.toml'),
    ]);
  });

  it('remove deletes agent files and strips config.toml', () => {
    const s = section();
    codexAdapter.mergeHarnessConfig(s, basePath);
    codexAdapter.installAgents(s, basePath);
    codexAdapter.remove(s, basePath);

    expect(existsSync(join(basePath, '.codex', 'agents', 'recon.toml'))).toBe(false);
    expect(existsSync(join(basePath, '.codex', 'agents', 'oracle.toml'))).toBe(false);
    expect(existsSync(join(basePath, '.codex', 'agents', 'architect.toml'))).toBe(false);
    expect(existsSync(join(basePath, '.codex', 'agents'))).toBe(false);
    expect(existsSync(join(basePath, '.codex', 'config.toml'))).toBe(false);
    expect(existsSync(join(basePath, '.codex'))).toBe(false);
  });

  it('remove preserves custom config.toml keys', () => {
    const s = section();
    codexAdapter.mergeHarnessConfig(s, basePath);
    const path = join(basePath, '.codex', 'config.toml');
    const content = TOML.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>;
    content.custom = 'value';
    writeFileSync(path, TOML.stringify(content));

    codexAdapter.remove(s, basePath);

    expect(existsSync(path)).toBe(true);
    const remaining = TOML.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>;
    expect(remaining.custom).toBe('value');
    expect(remaining.model).toBeUndefined();
  });

  it('remove leaves user-created files in the agents directory', () => {
    const s = section();
    codexAdapter.mergeHarnessConfig(s, basePath);
    codexAdapter.installAgents(s, basePath);

    const agentsDir = join(basePath, '.codex', 'agents');
    const userAgent = join(agentsDir, 'user-agent.toml');
    writeFileSync(userAgent, 'name = "user"');

    codexAdapter.remove(s, basePath);

    expect(existsSync(userAgent)).toBe(true);
    expect(existsSync(agentsDir)).toBe(true);
    expect(existsSync(join(agentsDir, 'recon.toml'))).toBe(false);

    // Cleanup so the empty-dir removal does not affect other assertions
    rmSync(agentsDir, { recursive: true, force: true });
  });
});
