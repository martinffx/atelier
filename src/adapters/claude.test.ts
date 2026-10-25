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
    expect(section.agents.map(a => a.model)).toEqual(['haiku', 'opus', 'opus', 'haiku']);
  });

  it('modelsForProvider returns anthropic models', () => {
    expect(claudeAdapter.modelsForProvider()).toEqual(['haiku', 'sonnet', 'opus', 'fable', 'best', 'opusplan']);
  });

  it('mergeHarnessConfig writes settings.json', () => {
    claudeAdapter.mergeHarnessConfig(section(), basePath);
    const settingsPath = join(basePath, '.claude', 'settings.json');
    expect(existsSync(settingsPath)).toBe(true);
    const content = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(content.$schema).toBeDefined();
    expect(content.model).toBe('opusplan');
    expect(content.disableClaudeAiConnectors).toBe(true);
    expect(content.syncClaudeAiSkills).toBe(false);
    expect(content.syncClaudeAiPlugins).toBe(false);
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
    for (const name of ['sentinel', 'oracle', 'architect', 'keymaker']) {
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
      join(basePath, '.claude', 'agents', 'keymaker.md'),
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
    expect(remaining.disableClaudeAiConnectors).toBeUndefined();
    expect(remaining.syncClaudeAiSkills).toBeUndefined();
    expect(remaining.syncClaudeAiPlugins).toBeUndefined();
  });

  it('remove keeps claude.ai settings the user changed after install', () => {
    const s = section();
    claudeAdapter.mergeHarnessConfig(s, basePath);
    const settingsPath = join(basePath, '.claude', 'settings.json');
    const content = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    content.disableClaudeAiConnectors = false;
    writeFileSync(settingsPath, JSON.stringify(content, null, 2));

    claudeAdapter.remove(s, basePath);

    const remaining = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(remaining.disableClaudeAiConnectors).toBe(false);
    expect(remaining.syncClaudeAiSkills).toBeUndefined();
  });

  const settingsFile = () => join(basePath, '.claude', 'settings.json');
  const readSettings = () => JSON.parse(readFileSync(settingsFile(), 'utf-8'));

  it('mergeHarnessConfig disables conflicting built-ins and keeps user deny rules', () => {
    mkdirSync(join(basePath, '.claude'), { recursive: true });
    writeFileSync(settingsFile(), JSON.stringify({ permissions: { allow: ['Bash(ls)'], deny: ['Bash(rm:*)'] }, skillOverrides: { cloudflare: 'off' } }));

    claudeAdapter.mergeHarnessConfig(section(), basePath);
    claudeAdapter.mergeHarnessConfig(section(), basePath);

    const content = readSettings();
    expect(content.disableBundledSkills).toBe(true);
    expect(content.enableArtifact).toBe(false);
    expect(content.disableWorkflows).toBe(true);
    expect(content.permissions.allow).toEqual(['Bash(ls)']);
    expect(content.permissions.deny).toEqual(['Bash(rm:*)', 'Artifact', 'ArtifactComments', 'ArtifactData', 'Workflow', 'DesignSync']);
    expect(content.env).toBeUndefined();
    expect(content.deniedMcpServers).toBeUndefined();
    expect(content.skillOverrides).toEqual({ cloudflare: 'off', 'security-review': 'off', ultrareview: 'off' });
  });

  it('mergeHarnessConfig applies and later removes selected optional built-ins', () => {
    mkdirSync(join(basePath, '.claude'), { recursive: true });
    writeFileSync(settingsFile(), JSON.stringify({ env: { KEEP: '1' }, deniedMcpServers: [{ serverName: 'other' }] }));

    claudeAdapter.mergeHarnessConfig({ ...section(), disabled_builtins: ['cron', 'chrome', 'remote-trigger'] }, basePath);
    let content = readSettings();
    expect(content.env).toEqual({ KEEP: '1', CLAUDE_CODE_DISABLE_CRON: '1' });
    expect(content.deniedMcpServers).toEqual([{ serverName: 'other' }, { serverName: 'claude-in-chrome' }]);
    expect(content.permissions.deny).toContain('RemoteTrigger');

    claudeAdapter.mergeHarnessConfig({ ...section(), disabled_builtins: ['chrome'] }, basePath);
    content = readSettings();
    expect(content.env).toEqual({ KEEP: '1' });
    expect(content.deniedMcpServers).toEqual([{ serverName: 'other' }, { serverName: 'claude-in-chrome' }]);
    expect(content.permissions.deny).not.toContain('RemoteTrigger');
  });

  it('remove strips built-in entries, drops empty containers and keeps user changes', () => {
    const s = { ...section(), disabled_builtins: ['cron', 'chrome', 'remote-trigger'] as ('cron' | 'chrome' | 'remote-trigger')[] };
    claudeAdapter.mergeHarnessConfig(s, basePath);
    const content = readSettings();
    content.disableWorkflows = false;
    content.customKey = 'value';
    writeFileSync(settingsFile(), JSON.stringify(content));

    claudeAdapter.remove(s, basePath);

    expect(readSettings()).toEqual({ customKey: 'value', disableWorkflows: false });
  });

  it('remove keeps user skill overrides and ones switched on', () => {
    mkdirSync(join(basePath, '.claude'), { recursive: true });
    writeFileSync(settingsFile(), JSON.stringify({ skillOverrides: { cloudflare: 'off' } }));
    claudeAdapter.mergeHarnessConfig(section(), basePath);
    const content = readSettings();
    content.skillOverrides.ultrareview = 'on';
    writeFileSync(settingsFile(), JSON.stringify(content));

    claudeAdapter.remove(section(), basePath);

    expect(readSettings().skillOverrides).toEqual({ cloudflare: 'off', ultrareview: 'on' });
  });

  it('config schema accepts known optional built-ins and rejects unknown ones', () => {
    expect(claudeAdapter.configSchema.safeParse({ ...section(), disabled_builtins: ['cron'] }).success).toBe(true);
    expect(claudeAdapter.configSchema.safeParse({ ...section(), disabled_builtins: ['bogus'] }).success).toBe(false);
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
