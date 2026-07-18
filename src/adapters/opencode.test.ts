import { describe, it, expect, beforeEach } from 'bun:test';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { opencodeAdapter, getOpencodeRoot } from './opencode.js';
import { getGlobalOpencodeDir } from '../services/paths.js';
import type { SharedConfig } from '../types.js';

const shared: SharedConfig = {
  version: '0.1.0',
  skills_source: 'martinffx/atelier',
  skills_path: '~/.agents/skills',
};

describe('opencode adapter', () => {
  let basePath: string;

  beforeEach(() => {
    basePath = mkdtempSync(join(tmpdir(), 'atelier-opencode-'));
  });

  it('defaultSection returns provider defaults', () => {
    const section = opencodeAdapter.defaultSection('amazon-bedrock');
    expect(section.provider).toBe('amazon-bedrock');
    expect(section.build_model).toContain('amazon-bedrock');
    expect(section.plan_model).toContain('amazon-bedrock');
  });

  it('modelsForProvider returns provider-scoped models', () => {
    const models = opencodeAdapter.modelsForProvider('opencode-go');
    expect(models.every(m => m.startsWith('opencode-go/'))).toBe(true);
  });

  it('mergeHarnessConfig writes opencode.json', () => {
    opencodeAdapter.mergeHarnessConfig(shared, opencodeAdapter.defaultSection(), basePath);
    const path = join(basePath, 'opencode.json');
    expect(existsSync(path)).toBe(true);
    const content = JSON.parse(readFileSync(path, 'utf-8'));
    expect(content.agent.build.mode).toBe('primary');
    expect(content.agent.plan.mode).toBe('primary');
  });

  it('mergeHarnessConfig preserves user settings', () => {
    mkdirSync(basePath, { recursive: true });
    writeFileSync(join(basePath, 'opencode.json'), JSON.stringify({ custom: 'value' }, null, 2));
    opencodeAdapter.mergeHarnessConfig(shared, opencodeAdapter.defaultSection(), basePath);
    const content = JSON.parse(readFileSync(join(basePath, 'opencode.json'), 'utf-8'));
    expect(content.custom).toBe('value');
    expect(content.agent.build.mode).toBe('primary');
  });

  it('installAgents writes agent files', () => {
    opencodeAdapter.installAgents(shared, opencodeAdapter.defaultSection(), basePath);
    const agentsDir = join(getOpencodeRoot(basePath), 'agent');
    for (const name of ['recon', 'oracle', 'architect']) {
      const path = join(agentsDir, `${name}.md`);
      expect(existsSync(path)).toBe(true);
      const content = readFileSync(path, 'utf-8');
      expect(content).toContain(`name: ${name}`);
      expect(content).toContain('mode: subagent');
    }
  });

  it('fileList reports managed files', () => {
    opencodeAdapter.mergeHarnessConfig(shared, opencodeAdapter.defaultSection(), basePath);
    opencodeAdapter.installAgents(shared, opencodeAdapter.defaultSection(), basePath);
    const files = opencodeAdapter.fileList(basePath);
    expect(files.map(f => f.path)).toEqual([
      join(basePath, 'opencode.json'),
      join(getOpencodeRoot(basePath), 'agent', 'recon.md'),
      join(getOpencodeRoot(basePath), 'agent', 'oracle.md'),
      join(getOpencodeRoot(basePath), 'agent', 'architect.md'),
    ]);
  });

  it('remove deletes agent files and strips opencode.json', () => {
    const section = opencodeAdapter.defaultSection();
    opencodeAdapter.mergeHarnessConfig(shared, section, basePath);
    opencodeAdapter.installAgents(shared, section, basePath);

    // legacy files
    const root = getOpencodeRoot(basePath);
    const pluginPath = join(root, 'plugins', 'atelier.js');
    mkdirSync(dirname(pluginPath), { recursive: true });
    writeFileSync(pluginPath, 'export default {};');

    opencodeAdapter.remove(shared, section, basePath);

    expect(existsSync(join(root, 'agent'))).toBe(false);
    expect(existsSync(pluginPath)).toBe(false);
    expect(existsSync(join(basePath, 'opencode.json'))).toBe(false);
  });

  it('remove preserves custom opencode.json keys', () => {
    const section = opencodeAdapter.defaultSection();
    opencodeAdapter.mergeHarnessConfig(shared, section, basePath);
    const path = join(basePath, 'opencode.json');
    const content = JSON.parse(readFileSync(path, 'utf-8'));
    content.custom = 'value';
    writeFileSync(path, JSON.stringify(content, null, 2));

    opencodeAdapter.remove(shared, section, basePath);

    expect(existsSync(path)).toBe(true);
    const remaining = JSON.parse(readFileSync(path, 'utf-8'));
    expect(remaining.custom).toBe('value');
    expect(remaining.agent).toBeUndefined();
  });

  it('getOpencodeRoot returns global dir for global base path', () => {
    expect(getOpencodeRoot(getGlobalOpencodeDir())).toBe(getGlobalOpencodeDir());
  });

  it('getOpencodeRoot returns .opencode subdir for project base path', () => {
    expect(getOpencodeRoot('/tmp/project')).toBe('/tmp/project/.opencode');
  });
});
