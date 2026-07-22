import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { claudeAdapter } from './claude.js';

const section = () => claudeAdapter.defaultSection();

describe('claude adapter', () => {
  let basePath: string;

  beforeEach(() => {
    basePath = mkdtempSync(join(tmpdir(), 'atelier-claude-'));
  });

  afterEach(() => {
    // Bun's tmpdir cleanup is automatic on process exit; leaving files is fine for tests.
  });

  it('defaultSection returns anthropic defaults', () => {
    const section = claudeAdapter.defaultSection();
    expect(section.provider).toBe('anthropic');
    expect(section.default_model).toBe('opusplan');
    expect(section.agents.map(a => a.model)).toEqual(['haiku', 'opus', 'opus']);
  });

  it('modelsForProvider returns anthropic models', () => {
    expect(claudeAdapter.modelsForProvider()).toEqual(['haiku', 'sonnet', 'opus', 'opusplan']);
  });

  it('mergeHarnessConfig writes settings.json', () => {
    claudeAdapter.mergeHarnessConfig(section(), basePath);
    const settingsPath = join(basePath, '.claude', 'settings.json');
    expect(existsSync(settingsPath)).toBe(true);
    const content = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(content.$schema).toBeDefined();
    expect(content.model).toBe('opusplan');
  });

  it('mergeHarnessConfig preserves user settings', () => {
    const claudeDir = join(basePath, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    const settingsPath = join(claudeDir, 'settings.json');
    writeFileSync(settingsPath, JSON.stringify({ customKey: 'value' }, null, 2));

    claudeAdapter.mergeHarnessConfig(section(), basePath);
    const content = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(content.customKey).toBe('value');
    expect(content.model).toBe('opusplan');
  });

  it('mergeHarnessConfig throws on malformed settings.json', () => {
    const claudeDir = join(basePath, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    const settingsPath = join(claudeDir, 'settings.json');
    writeFileSync(settingsPath, 'not valid json');

    expect(() => claudeAdapter.mergeHarnessConfig(section(), basePath)).toThrow();
  });

  it('installAgents writes agent files', () => {
    claudeAdapter.installAgents(section(), basePath);
    for (const name of ['sentinel', 'oracle', 'architect']) {
      const path = join(basePath, '.claude', 'agents', `${name}.md`);
      expect(existsSync(path)).toBe(true);
      const content = readFileSync(path, 'utf-8');
      expect(content).toContain(`name: ${name}`);
      expect(content).toContain('model:');
    }
  });

  it('fileList reports managed files', () => {
    claudeAdapter.mergeHarnessConfig(section(), basePath);
    claudeAdapter.installAgents(section(), basePath);
    const files = claudeAdapter.fileList(basePath);
    expect(files.map(f => f.path)).toEqual([
      join(basePath, '.claude', 'settings.json'),
      join(basePath, '.claude', 'agents', 'sentinel.md'),
      join(basePath, '.claude', 'agents', 'oracle.md'),
      join(basePath, '.claude', 'agents', 'architect.md'),
    ]);
  });

  it('remove deletes agent files and strips settings', () => {
    const s = section();
    claudeAdapter.mergeHarnessConfig(s, basePath);
    claudeAdapter.installAgents(s, basePath);

    claudeAdapter.remove(s, basePath);

    expect(existsSync(join(basePath, '.claude', 'agents', 'sentinel.md'))).toBe(false);
    expect(existsSync(join(basePath, '.claude', 'agents', 'oracle.md'))).toBe(false);
    expect(existsSync(join(basePath, '.claude', 'agents', 'architect.md'))).toBe(false);
    expect(existsSync(join(basePath, '.claude', 'agents'))).toBe(false);
    const settingsPath = join(basePath, '.claude', 'settings.json');
    expect(existsSync(settingsPath)).toBe(false);
  });

  it('remove preserves custom settings after stripping Atelier keys', () => {
    const s = section();
    claudeAdapter.mergeHarnessConfig(s, basePath);
    const settingsPath = join(basePath, '.claude', 'settings.json');
    const content = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    content.customKey = 'value';
    writeFileSync(settingsPath, JSON.stringify(content, null, 2));

    claudeAdapter.remove(s, basePath);

    expect(existsSync(settingsPath)).toBe(true);
    const remaining = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(remaining.customKey).toBe('value');
    expect(remaining.model).toBeUndefined();
    expect(remaining.$schema).toBeUndefined();
  });

  it('remove leaves user-created files in the agents directory', () => {
    const s = section();
    claudeAdapter.mergeHarnessConfig(s, basePath);
    claudeAdapter.installAgents(s, basePath);

    const agentsDir = join(basePath, '.claude', 'agents');
    const userAgent = join(agentsDir, 'user-agent.md');
    writeFileSync(userAgent, '# user agent');

    claudeAdapter.remove(s, basePath);

    expect(existsSync(userAgent)).toBe(true);
    expect(existsSync(agentsDir)).toBe(true);
    expect(existsSync(join(agentsDir, 'sentinel.md'))).toBe(false);
  });
});
