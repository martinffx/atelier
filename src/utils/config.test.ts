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
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills',
      claude: {
        default_model: 'opus',
        agents: [
          { template: 'recon', name: 'recon', model: 'haiku' },
          { template: 'oracle', name: 'oracle', model: 'opus' },
          { template: 'architect', name: 'architect', model: 'sonnet' },
        ],
      },
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
    writeFileSync(
      badConfigPath,
      JSON.stringify({ version: '1.0.0', skills_source: 'martinffx/atelier', skills_path: '~/.agents/skills' })
    );

    expect(() => readConfig(badConfigPath)).toThrow('Invalid configuration');
  });

  test('readConfig throws re-init error for old flat config', async () => {
    const { writeFileSync, mkdirSync } = await import('fs');
    const { readConfig } = await import('./config.js');

    mkdirSync(join(tempDir, '.atelier'), { recursive: true });
    writeFileSync(
      join(tempDir, '.atelier/config.json'),
      JSON.stringify({
        version: '1.0.0',
        harness: 'claude',
        skills_source: 'martinffx/atelier',
        skills_path: '~/.agents/skills',
        agents: [{ template: 'recon', name: 'recon', model: 'haiku' }],
      })
    );

    expect(() => readConfig(join(tempDir, '.atelier/config.json'))).toThrow(
      'Config format has changed. Run `atelier init --harness <claude|opencode|codex>` to reconfigure.'
    );
  });

  test('getDefaultConfig returns valid config with default models for claude', async () => {
    const { getDefaultConfig } = await import('./config.js');

    const config = getDefaultConfig('claude');

    expect(config.version).toBe('0.1.0');
    expect(config.skills_source).toBe('martinffx/atelier');
    expect(config.claude).toBeDefined();
    expect(config.claude?.default_model).toBe('opusplan');
    expect(config.claude?.agents).toHaveLength(3);

    const recon = config.claude?.agents.find(a => a.name === 'recon');
    expect(recon?.model).toBe('haiku');

    const oracle = config.claude?.agents.find(a => a.name === 'oracle');
    expect(oracle?.model).toBe('opus');

    const architect = config.claude?.agents.find(a => a.name === 'architect');
    expect(architect?.model).toBe('opus');
  });

  test('getDefaultConfig returns valid config with default models for codex', async () => {
    const { getDefaultConfig } = await import('./config.js');

    const config = getDefaultConfig('codex');

    expect(config.codex).toBeDefined();
    expect(config.codex?.default_model).toBe('gpt-5.6-terra');
    expect(config.codex?.agents).toHaveLength(3);

    const recon = config.codex?.agents.find(a => a.name === 'recon');
    expect(recon?.model).toBe('gpt-5.6-luna');

    const oracle = config.codex?.agents.find(a => a.name === 'oracle');
    expect(oracle?.model).toBe('gpt-5.6-sol');

    const architect = config.codex?.agents.find(a => a.name === 'architect');
    expect(architect?.model).toBe('gpt-5.6-sol');
  });

  test('getDefaultConfig returns valid config with default models for opencode zen', async () => {
    const { getDefaultConfig } = await import('./config.js');

    const config = getDefaultConfig('opencode', 'opencode-zen');

    expect(config.opencode).toBeDefined();
    expect(config.opencode?.provider).toBe('opencode-zen');

    const recon = config.opencode?.agents.find(a => a.name === 'recon');
    expect(recon?.model).toBe('opencode/minimax-m2.7');

    const oracle = config.opencode?.agents.find(a => a.name === 'oracle');
    expect(oracle?.model).toBe('opencode/kimi-k2.6');

    const architect = config.opencode?.agents.find(a => a.name === 'architect');
    expect(architect?.model).toBe('opencode/deepseek-v4-pro');
  });

  test('getDefaultConfig returns valid config with default models for opencode go', async () => {
    const { getDefaultConfig } = await import('./config.js');

    const config = getDefaultConfig('opencode', 'opencode-go');

    expect(config.opencode).toBeDefined();
    expect(config.opencode?.provider).toBe('opencode-go');

    const recon = config.opencode?.agents.find(a => a.name === 'recon');
    expect(recon?.model).toBe('opencode-go/minimax-m2.7');

    const oracle = config.opencode?.agents.find(a => a.name === 'oracle');
    expect(oracle?.model).toBe('opencode-go/kimi-k2.6');

    const architect = config.opencode?.agents.find(a => a.name === 'architect');
    expect(architect?.model).toBe('opencode-go/deepseek-v4-pro');
  });

  test('getDefaultConfig defaults to opencode-zen when no provider given for opencode', async () => {
    const { getDefaultConfig } = await import('./config.js');

    const config = getDefaultConfig('opencode');

    expect(config.opencode).toBeDefined();
    expect(config.opencode?.provider).toBe('opencode-zen');

    const recon = config.opencode?.agents.find(a => a.name === 'recon');
    expect(recon?.model).toBe('opencode/minimax-m2.7');
  });

  test('writeConfig then readConfig returns matching multi-harness config', async () => {
    const { writeConfig, readConfig } = await import('./config.js');

    const config = {
      version: '1.0.0' as const,
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills',
      claude: {
        default_model: 'opus',
        agents: [
          { template: 'recon', name: 'recon', model: 'haiku' },
          { template: 'oracle', name: 'oracle', model: 'opus' },
          { template: 'architect', name: 'architect', model: 'sonnet' },
        ],
      },
      codex: {
        default_model: 'gpt-5.6-terra',
        agents: [
          { template: 'recon', name: 'recon', model: 'gpt-5.6-luna' },
          { template: 'oracle', name: 'oracle', model: 'gpt-5.6-sol' },
          { template: 'architect', name: 'architect', model: 'gpt-5.6-sol' },
        ],
      },
    };

    const configPath = join(tempDir, '.atelier/config.json');
    writeConfig(config, configPath);

    const read = readConfig(configPath);
    expect(read).toEqual(config);
    expect(read?.claude).toBeDefined();
    expect(read?.codex).toBeDefined();
    expect(read?.opencode).toBeUndefined();
  });

  test('writeConfig creates parent directory if missing', async () => {
    const { writeConfig, readConfig } = await import('./config.js');

    const config = {
      version: '1.0.0' as const,
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills',
      claude: {
        default_model: 'opus',
        agents: [{ template: 'recon', name: 'recon', model: 'haiku' }],
      },
    };

    const configPath = join(tempDir, '.atelier/nested/config.json');
    writeConfig(config, configPath);

    const read = readConfig(configPath);
    expect(read).not.toBeNull();
    expect(read?.claude).toBeDefined();
  });
});
