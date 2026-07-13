import { describe, test, expect, afterEach, beforeEach } from 'bun:test';
import { mkdtempSync, rmSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'atelier-config-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('config', () => {
  test('writeConfig then readConfig returns matching config', async () => {
    const { writeConfig, readConfig } = await import('./config.js');

    const config = {
      version: '1.0.0' as const,
      harness: 'claude' as const,
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills',
      agents: [
        { template: 'recon', name: 'recon', model: 'haiku' },
        { template: 'oracle', name: 'oracle', model: 'opus' },
        { template: 'architect', name: 'architect', model: 'sonnet' },
      ],
    };

    const configPath = join(tempDir, '.atelier/config.json');
    writeConfig(config, configPath);

    const read = readConfig(configPath);
    expect(read).toEqual(config);
  });

  test('readConfig with no file returns null', async () => {
    const { readConfig } = await import('./config.js');

    const read = readConfig(join(tempDir, 'nonexistent.json'));
    expect(read).toBeNull();
  });

  test('readConfig throws on invalid JSON', async () => {
    const { writeFileSync } = await import('fs');
    const { readConfig } = await import('./config.js');

    const badConfigPath = join(tempDir, 'bad-config.json');
    writeFileSync(badConfigPath, 'not valid json');

    expect(() => readConfig(badConfigPath)).toThrow('Invalid JSON');
  });

  test('readConfig throws on invalid config structure', async () => {
    const { writeFileSync } = await import('fs');
    const { readConfig } = await import('./config.js');

    const badConfigPath = join(tempDir, 'bad-structure.json');
    writeFileSync(badConfigPath, JSON.stringify({ harness: 'invalid', agents: [] }));

    expect(() => readConfig(badConfigPath)).toThrow('Invalid configuration');
  });

  test('getDefaultConfig returns valid config with default models for claude', async () => {
    const { getDefaultConfig } = await import('./config.js');

    const config = getDefaultConfig('claude');

    expect(config.version).toBe('0.1.0');
    expect(config.harness).toBe('claude');
    expect(config.skills_source).toBe('martinffx/atelier');
    expect(config.agents).toHaveLength(3);

    const recon = config.agents.find(a => a.name === 'recon');
    expect(recon?.model).toBe('haiku');

    const oracle = config.agents.find(a => a.name === 'oracle');
    expect(oracle?.model).toBe('opus');

    const architect = config.agents.find(a => a.name === 'architect');
    expect(architect?.model).toBe('opus');
  });

  test('getDefaultConfig returns valid config with default models for opencode zen', async () => {
    const { getDefaultConfig } = await import('./config.js');

    const config = getDefaultConfig('opencode', 'opencode-zen');

    expect(config.harness).toBe('opencode');
    expect(config.provider).toBe('opencode-zen');

    const recon = config.agents.find(a => a.name === 'recon');
    expect(recon?.model).toBe('opencode/deepseek-v4-flash');

    const oracle = config.agents.find(a => a.name === 'oracle');
    expect(oracle?.model).toBe('opencode/kimi-k2.7-code');

    const architect = config.agents.find(a => a.name === 'architect');
    expect(architect?.model).toBe('opencode/deepseek-v4-pro');
  });

  test('getDefaultConfig returns valid config with default models for opencode go', async () => {
    const { getDefaultConfig } = await import('./config.js');

    const config = getDefaultConfig('opencode', 'opencode-go');

    expect(config.harness).toBe('opencode');
    expect(config.provider).toBe('opencode-go');

    const recon = config.agents.find(a => a.name === 'recon');
    expect(recon?.model).toBe('opencode-go/deepseek-v4-flash');

    const oracle = config.agents.find(a => a.name === 'oracle');
    expect(oracle?.model).toBe('opencode-go/kimi-k2.7-code');

    const architect = config.agents.find(a => a.name === 'architect');
    expect(architect?.model).toBe('opencode-go/deepseek-v4-pro');
  });

  test('getDefaultConfig defaults to opencode-zen when no provider given for opencode', async () => {
    const { getDefaultConfig } = await import('./config.js');

    const config = getDefaultConfig('opencode');

    expect(config.harness).toBe('opencode');
    expect(config.provider).toBeUndefined();

    // Should use opencode-zen defaults
    const recon = config.agents.find(a => a.name === 'recon');
    expect(recon?.model).toBe('opencode/deepseek-v4-flash');
  });

  test('readConfig filters out agents with unknown templates', async () => {
    const { writeFileSync, mkdirSync } = await import('fs');
    const { readConfig } = await import('./config.js');

    mkdirSync(join(tempDir, '.atelier'), { recursive: true });
    writeFileSync(join(tempDir, '.atelier/config.json'), JSON.stringify({
      version: '1.0.0',
      harness: 'claude',
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills',
      agents: [
        { template: 'recon', name: 'recon', model: 'haiku' },
        { template: 'scout', name: 'scout', model: 'fast-model' },
        { template: 'architect', name: 'architect', model: 'opus' },
      ],
    }));

    const read = readConfig(join(tempDir, '.atelier/config.json'));
    expect(read).not.toBeNull();
    expect(read?.agents).toHaveLength(3);
    expect(read?.agents.find(a => a.name === 'recon')).toBeDefined();
    expect(read?.agents.find(a => a.name === 'oracle')).toBeDefined();
    expect(read?.agents.find(a => a.name === 'scout')).toBeUndefined();
  });

  test('readConfig migrates legacy skills_path', async () => {
    const { writeFileSync, mkdirSync } = await import('fs');
    const { readConfig } = await import('./config.js');

    mkdirSync(join(tempDir, '.atelier'), { recursive: true });
    writeFileSync(join(tempDir, '.atelier/config.json'), JSON.stringify({
      version: '1.0.0',
      harness: 'claude',
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills/atelier',
      agents: [
        { template: 'recon', name: 'recon', model: 'haiku' },
      ],
    }));

    const read = readConfig(join(tempDir, '.atelier/config.json'));
    expect(read).not.toBeNull();
    expect(read?.skills_path).toBe('~/.agents/skills');
  });

  test('writeConfig creates parent directory if missing', async () => {
    const { writeConfig, readConfig } = await import('./config.js');

    const config = {
      version: '1.0.0' as const,
      harness: 'claude' as const,
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills',
      agents: [
        { template: 'recon', name: 'recon', model: 'haiku' },
      ],
    };

    const configPath = join(tempDir, '.atelier/nested/config.json');
    writeConfig(config, configPath);

    const read = readConfig(configPath);
    expect(read).not.toBeNull();
    expect(read?.harness).toBe('claude');
  });
});