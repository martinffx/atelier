import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { claudeAdapter } from './claude.js';
import type { SharedConfig } from '../types.js';

const shared: SharedConfig = {
  version: '0.1.0',
  skills_source: 'martinffx/atelier',
  skills_path: '~/.agents/skills',
};

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

  it('mergeHarnessConfig writes settings.json without hooks', () => {
    claudeAdapter.mergeHarnessConfig(shared, claudeAdapter.defaultSection(), basePath);
    const settingsPath = join(basePath, '.claude', 'settings.json');
    expect(existsSync(settingsPath)).toBe(true);
    const content = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(content.$schema).toBeDefined();
    expect(content.model).toBe('opusplan');
    expect(content.hooks).toBeUndefined();
  });

  it('mergeHarnessConfig preserves user settings and removes legacy hooks', () => {
    const claudeDir = join(basePath, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    const settingsPath = join(claudeDir, 'settings.json');
    writeFileSync(settingsPath, JSON.stringify({
      customKey: 'value',
      hooks: {
        SessionStart: [
          { hooks: [{ command: 'hooks/atelier-session-start', type: 'command' }], matcher: 'startup' },
        ],
      },
    }, null, 2));

    claudeAdapter.mergeHarnessConfig(shared, claudeAdapter.defaultSection(), basePath);
    const content = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(content.customKey).toBe('value');
    expect(content.model).toBe('opusplan');
    expect(content.hooks).toBeUndefined();
  });

  it('installAgents writes agent files', () => {
    claudeAdapter.installAgents(shared, claudeAdapter.defaultSection(), basePath);
    for (const name of ['recon', 'oracle', 'architect']) {
      const path = join(basePath, '.claude', 'agents', `${name}.md`);
      expect(existsSync(path)).toBe(true);
      const content = readFileSync(path, 'utf-8');
      expect(content).toContain(`name: ${name}`);
      expect(content).toContain('model:');
    }
  });

  it('fileList reports managed files', () => {
    claudeAdapter.mergeHarnessConfig(shared, claudeAdapter.defaultSection(), basePath);
    claudeAdapter.installAgents(shared, claudeAdapter.defaultSection(), basePath);
    const files = claudeAdapter.fileList(basePath);
    expect(files.map(f => f.path)).toEqual([
      join(basePath, '.claude', 'settings.json'),
      join(basePath, '.claude', 'agents', 'recon.md'),
      join(basePath, '.claude', 'agents', 'oracle.md'),
      join(basePath, '.claude', 'agents', 'architect.md'),
    ]);
  });

  it('remove deletes agent files, legacy hook, and strips settings', () => {
    const section = claudeAdapter.defaultSection();
    claudeAdapter.mergeHarnessConfig(shared, section, basePath);
    claudeAdapter.installAgents(shared, section, basePath);

    const hookPath = join(basePath, 'hooks', 'atelier-session-start');
    mkdirSync(dirname(hookPath), { recursive: true });
    writeFileSync(hookPath, '#!/bin/bash\necho test');

    claudeAdapter.remove(shared, section, basePath);

    expect(existsSync(join(basePath, '.claude', 'agents'))).toBe(false);
    expect(existsSync(hookPath)).toBe(false);
    const settingsPath = join(basePath, '.claude', 'settings.json');
    expect(existsSync(settingsPath)).toBe(false);
  });

  it('remove preserves custom settings after stripping Atelier keys', () => {
    const section = claudeAdapter.defaultSection();
    claudeAdapter.mergeHarnessConfig(shared, section, basePath);
    const settingsPath = join(basePath, '.claude', 'settings.json');
    const content = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    content.customKey = 'value';
    writeFileSync(settingsPath, JSON.stringify(content, null, 2));

    claudeAdapter.remove(shared, section, basePath);

    expect(existsSync(settingsPath)).toBe(true);
    const remaining = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(remaining.customKey).toBe('value');
    expect(remaining.model).toBeUndefined();
    expect(remaining.$schema).toBeUndefined();
  });
});
