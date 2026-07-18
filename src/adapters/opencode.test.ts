import { describe, it, expect, beforeEach } from 'bun:test';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { opencodeAdapter, getOpencodeRoot } from './opencode.js';
import { getGlobalOpencodeDir } from '../services/paths.js';

const section = (provider?: Parameters<typeof opencodeAdapter.defaultSection>[0]) => opencodeAdapter.defaultSection(provider);

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

  it('exposes direct OpenAI models and defaults', () => {
    const openAiSection = opencodeAdapter.defaultSection('openai');
    const models = opencodeAdapter.modelsForProvider('openai');

    expect(openAiSection.provider).toBe('openai');
    expect(openAiSection.build_model).toBe('openai/gpt-5.6-terra');
    expect(openAiSection.plan_model).toBe('openai/gpt-5.6-sol');
    expect(openAiSection.agents).toEqual([
      { template: 'recon', name: 'recon', model: 'openai/gpt-5.6-luna' },
      { template: 'oracle', name: 'oracle', model: 'openai/gpt-5.6-sol' },
      { template: 'architect', name: 'architect', model: 'openai/gpt-5.6-sol' },
    ]);
    expect(models.every(model => model.startsWith('openai/'))).toBe(true);
  });

  it('mergeHarnessConfig writes opencode.json', () => {
    opencodeAdapter.mergeHarnessConfig(section(), basePath);
    const path = join(basePath, 'opencode.json');
    expect(existsSync(path)).toBe(true);
    const content = JSON.parse(readFileSync(path, 'utf-8'));
    expect(content.agent.build.mode).toBe('primary');
    expect(content.agent.plan.mode).toBe('primary');
  });

  it('mergeHarnessConfig preserves user settings', () => {
    mkdirSync(basePath, { recursive: true });
    writeFileSync(join(basePath, 'opencode.json'), JSON.stringify({ custom: 'value' }, null, 2));
    opencodeAdapter.mergeHarnessConfig(section(), basePath);
    const content = JSON.parse(readFileSync(join(basePath, 'opencode.json'), 'utf-8'));
    expect(content.custom).toBe('value');
    expect(content.agent.build.mode).toBe('primary');
  });

  it('mergeHarnessConfig throws on malformed opencode.json', () => {
    mkdirSync(basePath, { recursive: true });
    writeFileSync(join(basePath, 'opencode.json'), 'not valid json');

    expect(() => opencodeAdapter.mergeHarnessConfig(section(), basePath)).toThrow();
  });

  it('installAgents writes agent files', () => {
    opencodeAdapter.installAgents(section(), basePath);
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
    opencodeAdapter.mergeHarnessConfig(section(), basePath);
    opencodeAdapter.installAgents(section(), basePath);
    const files = opencodeAdapter.fileList(basePath);
    expect(files.map(f => f.path)).toEqual([
      join(basePath, 'opencode.json'),
      join(getOpencodeRoot(basePath), 'agent', 'recon.md'),
      join(getOpencodeRoot(basePath), 'agent', 'oracle.md'),
      join(getOpencodeRoot(basePath), 'agent', 'architect.md'),
    ]);
  });

  it('remove deletes agent files and strips opencode.json', () => {
    const s = section();
    opencodeAdapter.mergeHarnessConfig(s, basePath);
    opencodeAdapter.installAgents(s, basePath);

    // legacy files
    const root = getOpencodeRoot(basePath);
    const pluginPath = join(root, 'plugins', 'atelier.js');
    mkdirSync(dirname(pluginPath), { recursive: true });
    writeFileSync(pluginPath, 'export default {};');

    opencodeAdapter.remove(s, basePath);

    expect(existsSync(join(root, 'agent', 'recon.md'))).toBe(false);
    expect(existsSync(join(root, 'agent', 'oracle.md'))).toBe(false);
    expect(existsSync(join(root, 'agent', 'architect.md'))).toBe(false);
    expect(existsSync(join(root, 'agent'))).toBe(false);
    expect(existsSync(pluginPath)).toBe(false);
    expect(existsSync(join(basePath, 'opencode.json'))).toBe(false);
  });

  it('remove preserves custom opencode.json keys', () => {
    const s = section();
    opencodeAdapter.mergeHarnessConfig(s, basePath);
    const path = join(basePath, 'opencode.json');
    const content = JSON.parse(readFileSync(path, 'utf-8'));
    content.custom = 'value';
    writeFileSync(path, JSON.stringify(content, null, 2));

    opencodeAdapter.remove(s, basePath);

    expect(existsSync(path)).toBe(true);
    const remaining = JSON.parse(readFileSync(path, 'utf-8'));
    expect(remaining.custom).toBe('value');
    expect(remaining.agent?.build).toBeUndefined();
    expect(remaining.agent?.plan).toBeUndefined();
  });

  it('remove leaves user-created files in the agent directory', () => {
    const s = section();
    opencodeAdapter.mergeHarnessConfig(s, basePath);
    opencodeAdapter.installAgents(s, basePath);

    const agentsDir = join(getOpencodeRoot(basePath), 'agent');
    const userAgent = join(agentsDir, 'user-agent.md');
    writeFileSync(userAgent, '# user agent');

    opencodeAdapter.remove(s, basePath);

    expect(existsSync(userAgent)).toBe(true);
    expect(existsSync(agentsDir)).toBe(true);
    expect(existsSync(join(agentsDir, 'recon.md'))).toBe(false);

    rmSync(agentsDir, { recursive: true, force: true });
  });

  it('getOpencodeRoot returns global dir for global base path', () => {
    expect(getOpencodeRoot(getGlobalOpencodeDir())).toBe(getGlobalOpencodeDir());
  });

  it('getOpencodeRoot returns .opencode subdir for project base path', () => {
    expect(getOpencodeRoot('/tmp/project')).toBe('/tmp/project/.opencode');
  });
});
