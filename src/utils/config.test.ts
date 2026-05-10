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
      skills_path: '~/.agents/skills/atelier',
      agents: [
        { template: 'scout', name: 'scout', model: 'haiku' },
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

  test('getDefaultConfig returns valid config with default models for claude', async () => {
    const { getDefaultConfig } = await import('./config.js');

    const config = getDefaultConfig('claude');

    expect(config.version).toBe('0.1.0');
    expect(config.harness).toBe('claude');
    expect(config.skills_source).toBe('martinffx/atelier');
    expect(config.agents).toHaveLength(3);

    const scout = config.agents.find(a => a.name === 'scout');
    expect(scout?.model).toBe('haiku');

    const oracle = config.agents.find(a => a.name === 'oracle');
    expect(oracle?.model).toBe('opus');

    const architect = config.agents.find(a => a.name === 'architect');
    expect(architect?.model).toBe('opus');
  });

  test('getDefaultConfig returns valid config with default models for opencode', async () => {
    const { getDefaultConfig } = await import('./config.js');

    const config = getDefaultConfig('opencode');

    expect(config.harness).toBe('opencode');

    const scout = config.agents.find(a => a.name === 'scout');
    expect(scout?.model).toBe('opencode/deepseek-v4-flash');

    const oracle = config.agents.find(a => a.name === 'oracle');
    expect(oracle?.model).toBe('opencode-go/kimi-k2.6');

    const architect = config.agents.find(a => a.name === 'architect');
    expect(architect?.model).toBe('opencode-go/deepseek-v4-pro');
  });

  test('writeConfig creates parent directory if missing', async () => {
    const { writeConfig, readConfig } = await import('./config.js');

    const config = {
      version: '1.0.0' as const,
      harness: 'claude' as const,
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills/atelier',
      agents: [],
    };

    const configPath = join(tempDir, '.atelier/nested/config.json');
    writeConfig(config, configPath);

    const read = readConfig(configPath);
    expect(read).not.toBeNull();
    expect(read?.harness).toBe('claude');
  });
});