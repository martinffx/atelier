import { describe, it, expect, beforeEach } from 'bun:test';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as TOML from 'smol-toml';
import { codexAdapter } from './codex.js';
import type { SharedConfig } from '../types.js';

const shared: SharedConfig = {
  version: '0.1.0',
  skills_source: 'martinffx/atelier',
  skills_path: '~/.agents/skills',
};

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
    codexAdapter.mergeHarnessConfig(shared, codexAdapter.defaultSection(), basePath);
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
    codexAdapter.mergeHarnessConfig(shared, codexAdapter.defaultSection(), basePath);
    const content = TOML.parse(readFileSync(join(codexDir, 'config.toml'), 'utf-8')) as Record<string, unknown>;
    expect(content.custom).toBe('value');
    expect(content.model).toBe('gpt-5.6-terra');
  });

  it('installAgents writes agent toml files', () => {
    codexAdapter.installAgents(shared, codexAdapter.defaultSection(), basePath);
    for (const name of ['recon', 'oracle', 'architect']) {
      const path = join(basePath, '.codex', 'agents', `${name}.toml`);
      expect(existsSync(path)).toBe(true);
      const content = TOML.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>;
      expect(content.name).toBe(name);
      expect(content.sandbox_mode).toBe('read-only');
    }
  });

  it('fileList reports managed files', () => {
    codexAdapter.mergeHarnessConfig(shared, codexAdapter.defaultSection(), basePath);
    codexAdapter.installAgents(shared, codexAdapter.defaultSection(), basePath);
    const files = codexAdapter.fileList(basePath);
    expect(files.map(f => f.path)).toEqual([
      join(basePath, '.codex', 'config.toml'),
      join(basePath, '.codex', 'agents', 'recon.toml'),
      join(basePath, '.codex', 'agents', 'oracle.toml'),
      join(basePath, '.codex', 'agents', 'architect.toml'),
    ]);
  });

  it('remove deletes agent files and strips config.toml', () => {
    const section = codexAdapter.defaultSection();
    codexAdapter.mergeHarnessConfig(shared, section, basePath);
    codexAdapter.installAgents(shared, section, basePath);
    codexAdapter.remove(shared, section, basePath);

    expect(existsSync(join(basePath, '.codex', 'agents'))).toBe(false);
    expect(existsSync(join(basePath, '.codex', 'config.toml'))).toBe(false);
    expect(existsSync(join(basePath, '.codex'))).toBe(false);
  });

  it('remove preserves custom config.toml keys', () => {
    const section = codexAdapter.defaultSection();
    codexAdapter.mergeHarnessConfig(shared, section, basePath);
    const path = join(basePath, '.codex', 'config.toml');
    const content = TOML.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>;
    content.custom = 'value';
    writeFileSync(path, TOML.stringify(content));

    codexAdapter.remove(shared, section, basePath);

    expect(existsSync(path)).toBe(true);
    const remaining = TOML.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>;
    expect(remaining.custom).toBe('value');
    expect(remaining.model).toBeUndefined();
  });
});
