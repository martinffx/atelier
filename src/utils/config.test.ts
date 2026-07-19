import { describe, test, expect, afterEach, beforeEach } from 'bun:test';
import { mkdtempSync, rmSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import '../adapters/index.js';
import { cursorAdapter } from '../adapters/cursor.js';
import { opencodeAdapter } from '../adapters/opencode.js';

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

    const result = readConfig(configPath);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(config);
    }
  });

  test('readConfig with no file returns not-found error', async () => {
    const { readConfig } = await import('./config.js');

    const result = readConfig(join(tempDir, 'nonexistent.json'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('not-found');
    }
  });

  test('readConfig returns invalid error on invalid JSON', async () => {
    const { writeFileSync } = await import('fs');
    const { readConfig } = await import('./config.js');

    const badConfigPath = join(tempDir, 'bad-config.json');
    writeFileSync(badConfigPath, 'not valid json');

    const result = readConfig(badConfigPath);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('invalid');
      expect(result.error.message).toContain('Invalid JSON');
    }
  });

  test('readConfig returns invalid error on invalid config structure', async () => {
    const { writeFileSync } = await import('fs');
    const { readConfig } = await import('./config.js');

    const badConfigPath = join(tempDir, 'bad-structure.json');
    writeFileSync(
      badConfigPath,
      JSON.stringify({ version: '1.0.0', skills_source: 'martinffx/atelier', skills_path: '~/.agents/skills' })
    );

    const result = readConfig(badConfigPath);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('invalid');
      expect(result.error.message).toContain('At least one harness must be configured');
    }
  });

  test('readConfig returns old-format error for old flat config', async () => {
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

    const result = readConfig(join(tempDir, '.atelier/config.json'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('old-format');
      expect(result.error.message).toContain('Config format has changed');
    }
  });

  test('readConfig returns old-format error when harness sections are explicitly null', async () => {
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
        claude: null,
        codex: null,
        opencode: null,
        cursor: null,
      })
    );

    const result = readConfig(join(tempDir, '.atelier/config.json'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('old-format');
    }
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

  test('opencode adapter defaultSection returns valid config with default models for opencode zen', () => {
    const section = opencodeAdapter.defaultSection('opencode-zen');

    expect(section.provider).toBe('opencode-zen');

    const recon = section.agents.find(a => a.name === 'recon');
    expect(recon?.model).toBe('opencode/minimax-m2.7');

    const oracle = section.agents.find(a => a.name === 'oracle');
    expect(oracle?.model).toBe('opencode/kimi-k2.6');

    const architect = section.agents.find(a => a.name === 'architect');
    expect(architect?.model).toBe('opencode/deepseek-v4-pro');
  });

  test('opencode adapter defaultSection returns valid config with default models for opencode go', () => {
    const section = opencodeAdapter.defaultSection('opencode-go');

    expect(section.provider).toBe('opencode-go');

    const recon = section.agents.find(a => a.name === 'recon');
    expect(recon?.model).toBe('opencode-go/minimax-m2.7');

    const oracle = section.agents.find(a => a.name === 'oracle');
    expect(oracle?.model).toBe('opencode-go/kimi-k2.6');

    const architect = section.agents.find(a => a.name === 'architect');
    expect(architect?.model).toBe('opencode-go/deepseek-v4-pro');
  });

  test('opencode config accepts the OpenAI provider', async () => {
    const { validateConfig } = await import('./config.js');
    const opencode = opencodeAdapter.defaultSection('openai');

    expect(validateConfig({
      version: '1.0.0',
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills',
      opencode,
    }).opencode?.provider).toBe('openai');
  });

  test('opencode adapter defaultSection defaults to opencode-zen when no provider given', () => {
    const section = opencodeAdapter.defaultSection();

    expect(section.provider).toBe('opencode-zen');

    const recon = section.agents.find(a => a.name === 'recon');
    expect(recon?.model).toBe('opencode/minimax-m2.7');
  });

  test('cursor config accepts only agent selections', async () => {
    const { validateConfig } = await import('./config.js');
    const cursor = cursorAdapter.defaultSection();

    expect(validateConfig({
      version: '1.0.0',
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills',
      cursor,
    }).cursor).toEqual(cursor);

    expect(() => validateConfig({
      version: '1.0.0',
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills',
      cursor: { default_model: 'composer-2.5', agents: [] },
    })).toThrow();
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
      cursor: {
        agents: [
          { template: 'recon', name: 'recon', model: 'composer-2.5' },
          { template: 'oracle', name: 'oracle', model: 'claude-opus-4-8-high' },
          { template: 'architect', name: 'architect', model: 'gpt-5.6-sol-medium' },
        ],
      },
    };

    const configPath = join(tempDir, '.atelier/config.json');
    writeConfig(config, configPath);

    const result = readConfig(configPath);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(config);
      expect(result.value.claude).toBeDefined();
      expect(result.value.codex).toBeDefined();
      expect(result.value.opencode).toBeUndefined();
      expect(result.value.cursor).toEqual(config.cursor);
    }
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

    const result = readConfig(configPath);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.claude).toBeDefined();
    }
  });
});
