import { describe, test, expect, afterEach, beforeEach } from 'bun:test';
import { mkdtempSync, rmSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import '../adapters/index.js';
import { claudeAdapter } from '../adapters/claude.js';
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
          { template: 'sentinel', name: 'sentinel', model: 'haiku' },
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
      })
    );

    const result = readConfig(join(tempDir, '.atelier/config.json'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('old-format');
    }
  });

  test('readConfig migrates legacy recon entries without changing models', async () => {
    const { writeFileSync, mkdirSync } = await import('fs');
    const { readConfig } = await import('./config.js');
    const configPath = join(tempDir, '.atelier/config.json');
    mkdirSync(join(tempDir, '.atelier'), { recursive: true });
    writeFileSync(configPath, JSON.stringify({
      version: '1.0.0',
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills',
      claude: {
        default_model: 'opus',
        agents: [{ template: 'recon', name: 'recon', model: 'custom-model' }],
      },
    }));

    const result = readConfig(configPath);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.claude?.agents).toEqual([
        { template: 'sentinel', name: 'sentinel', model: 'custom-model' },
      ]);
    }
  });

  test('readConfig keeps a saved Claude opusplan and carries plan thinking into build thinking', async () => {
    const { writeFileSync, mkdirSync } = await import('fs');
    const { readConfig } = await import('./config.js');
    const configPath = join(tempDir, '.atelier/config.json');
    mkdirSync(join(tempDir, '.atelier'), { recursive: true });
    writeFileSync(configPath, JSON.stringify({
      version: '1.0.0',
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills',
      claude: {
        default_model: 'opusplan',
        build_thinking: 'low',
        plan_thinking: 'high',
        agents: [{ template: 'sentinel', name: 'sentinel', model: 'haiku' }],
      },
    }));

    const result = readConfig(configPath);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.claude?.default_model).toBe('opusplan');
      expect(result.value.claude?.build_thinking).toBe('high');
      expect('plan_thinking' in (result.value.claude ?? {})).toBe(false);
    }
  });

  test('readConfig keeps a saved Claude opusplan without plan thinking and keeps its build thinking', async () => {
    const { writeFileSync, mkdirSync } = await import('fs');
    const { readConfig } = await import('./config.js');
    const configPath = join(tempDir, '.atelier/config.json');
    mkdirSync(join(tempDir, '.atelier'), { recursive: true });
    writeFileSync(configPath, JSON.stringify({
      version: '1.0.0',
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills',
      claude: {
        default_model: 'opusplan',
        build_thinking: 'low',
        agents: [{ template: 'sentinel', name: 'sentinel', model: 'haiku' }],
      },
    }));

    const result = readConfig(configPath);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.claude?.default_model).toBe('opusplan');
      expect(result.value.claude?.build_thinking).toBe('low');
    }
  });

  test('readConfig maps Claude agents saved as opusplan to opus and keeps their thinking', async () => {
    const { writeFileSync, mkdirSync } = await import('fs');
    const { readConfig } = await import('./config.js');
    const configPath = join(tempDir, '.atelier/config.json');
    mkdirSync(join(tempDir, '.atelier'), { recursive: true });
    writeFileSync(configPath, JSON.stringify({
      version: '1.0.0',
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills',
      claude: {
        default_model: 'opus',
        build_thinking: 'high',
        agents: [
          { template: 'oracle', name: 'oracle', model: 'opusplan', thinking: 'high' },
          { template: 'architect', name: 'architect', model: 'opusplan', thinking: 'max' },
          { template: 'sentinel', name: 'sentinel', model: 'haiku' },
        ],
      },
    }));

    const result = readConfig(configPath);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.claude?.agents).toEqual([
        { template: 'oracle', name: 'oracle', model: 'opus', thinking: 'high' },
        { template: 'architect', name: 'architect', model: 'opus', thinking: 'max' },
        { template: 'sentinel', name: 'sentinel', model: 'haiku' },
      ]);
    }
  });

  test('readConfig keeps legacy Codex plan_thinking, which applied to the session model', async () => {
    const { writeFileSync, mkdirSync } = await import('fs');
    const { readConfig } = await import('./config.js');
    const configPath = join(tempDir, '.atelier/config.json');
    mkdirSync(join(tempDir, '.atelier'), { recursive: true });
    writeFileSync(configPath, JSON.stringify({
      version: '1.0.0',
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills',
      codex: {
        default_model: 'gpt-6-sol',
        build_thinking: 'medium',
        plan_thinking: 'high',
        agents: [{ template: 'sentinel', name: 'sentinel', model: 'gpt-6-luna' }],
      },
    }));

    const result = readConfig(configPath);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.codex?.default_model).toBe('gpt-6-sol');
      expect(result.value.codex?.build_thinking).toBe('medium');
      expect((result.value.codex as { plan_thinking?: string }).plan_thinking).toBe('high');
    }
  });

  test('readConfig migrates legacy OpenCode build_model to default_model, drops plan_model and keeps a supported plan_thinking', async () => {
    const { writeFileSync, mkdirSync } = await import('fs');
    const { readConfig } = await import('./config.js');
    const configPath = join(tempDir, '.atelier/config.json');
    mkdirSync(join(tempDir, '.atelier'), { recursive: true });
    writeFileSync(configPath, JSON.stringify({
      version: '1.0.0',
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills',
      opencode: {
        provider: 'opencode-zen',
        build_model: 'opencode/kimi-k3',
        plan_model: 'opencode/glm-5.3',
        build_thinking: 'low',
        plan_thinking: 'high',
        agents: [{ template: 'sentinel', name: 'sentinel', model: 'opencode/glm-5.3-flash' }],
      },
    }));

    const result = readConfig(configPath);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const section = result.value.opencode ?? {};
      expect(section.default_model).toBe('opencode/kimi-k3');
      expect(section.build_thinking).toBe('low');
      expect('build_model' in section).toBe(false);
      expect('plan_model' in section).toBe(false);
      expect((section as { plan_thinking?: string }).plan_thinking).toBe('high');
    }
  });

  test('readConfig drops legacy OpenCode plan_thinking that default_model does not support instead of failing', async () => {
    const { writeFileSync, mkdirSync } = await import('fs');
    const { readConfig } = await import('./config.js');
    const configPath = join(tempDir, '.atelier/config.json');
    mkdirSync(join(tempDir, '.atelier'), { recursive: true });
    writeFileSync(configPath, JSON.stringify({
      version: '1.0.0',
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills',
      opencode: {
        provider: 'opencode-zen',
        build_model: 'opencode/glm-5.3',
        plan_model: 'opencode/gemini-4-argon',
        build_thinking: 'low',
        plan_thinking: 'medium',
        agents: [{ template: 'sentinel', name: 'sentinel', model: 'opencode/glm-5.3-flash' }],
      },
    }));

    const result = readConfig(configPath);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const section = result.value.opencode ?? {};
      expect(section.default_model).toBe('opencode/glm-5.3');
      expect('plan_thinking' in section).toBe(false);
    }
  });

  test('getDefaultConfig returns valid config with default models for claude', async () => {
    const { getDefaultConfig } = await import('./config.js');

    const config = getDefaultConfig('claude');

    expect(config.version).toBe('0.1.0');
    expect(config.skills_source).toBe('martinffx/atelier');
    expect(config.claude).toBeDefined();
    expect(config.claude?.default_model).toBe('opus');
    expect(config.claude?.agents).toHaveLength(4);

    const sentinel = config.claude?.agents.find(a => a.name === 'sentinel');
    expect(sentinel?.model).toBe('haiku');

    const oracle = config.claude?.agents.find(a => a.name === 'oracle');
    expect(oracle?.model).toBe('opus');

    const architect = config.claude?.agents.find(a => a.name === 'architect');
    expect(architect?.model).toBe('opus');
  });

  test('getDefaultConfig returns valid config with default models for codex', async () => {
    const { getDefaultConfig } = await import('./config.js');

    const config = getDefaultConfig('codex');

    expect(config.codex).toBeDefined();
    expect(config.codex?.default_model).toBe('gpt-6-astra');
    expect(config.codex?.agents).toHaveLength(4);

    const sentinel = config.codex?.agents.find(a => a.name === 'sentinel');
    expect(sentinel?.model).toBe('gpt-6-luna');

    const oracle = config.codex?.agents.find(a => a.name === 'oracle');
    expect(oracle?.model).toBe('gpt-6-astra');

    const architect = config.codex?.agents.find(a => a.name === 'architect');
    expect(architect?.model).toBe('gpt-6-astra');
  });

  test('opencode adapter defaultSection returns valid config with default models for opencode zen', () => {
    const section = opencodeAdapter.defaultSection('opencode-zen');

    expect(section.provider).toBe('opencode-zen');

    const sentinel = section.agents.find(a => a.name === 'sentinel');
    expect(sentinel?.model).toBe('opencode/glm-5.3-flash');

    const oracle = section.agents.find(a => a.name === 'oracle');
    expect(oracle?.model).toBe('opencode/kimi-k3');

    const architect = section.agents.find(a => a.name === 'architect');
    expect(architect?.model).toBe('opencode/glm-5.3');
  });

  test('opencode adapter defaultSection returns valid config with default models for opencode go', () => {
    const section = opencodeAdapter.defaultSection('opencode-go');

    expect(section.provider).toBe('opencode-go');

    const sentinel = section.agents.find(a => a.name === 'sentinel');
    expect(sentinel?.model).toBe('opencode-go/glm-5.3-flash');

    const oracle = section.agents.find(a => a.name === 'oracle');
    expect(oracle?.model).toBe('opencode-go/mimo-v2.6-pro');

    const architect = section.agents.find(a => a.name === 'architect');
    expect(architect?.model).toBe('opencode-go/glm-5.3');
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

    const sentinel = section.agents.find(a => a.name === 'sentinel');
    expect(sentinel?.model).toBe('opencode/glm-5.3-flash');
  });

  test('drops a saved cursor section on load', async () => {
    const { validateConfig } = await import('./config.js');
    const claude = claudeAdapter.defaultSection();

    const config = validateConfig({
      version: '1.0.0',
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills',
      claude,
      cursor: { agents: [{ template: 'sentinel', name: 'sentinel', model: 'composer-2.5' }] },
    });

    expect(config.claude).toEqual(claude);
    expect('cursor' in config).toBe(false);
  });

  test('readConfig returns invalid with next steps for a cursor-only config', async () => {
    const { writeFileSync, mkdirSync } = await import('fs');
    const { readConfig } = await import('./config.js');
    const configPath = join(tempDir, '.atelier/config.json');
    mkdirSync(join(tempDir, '.atelier'), { recursive: true });
    writeFileSync(configPath, JSON.stringify({
      version: '0.1.0',
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills',
      cursor: { agents: [{ template: 'sentinel', name: 'sentinel', model: 'composer-2.5' }] },
    }));

    const result = readConfig(configPath);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('invalid');
      const message = (result.error as { message: string }).message;
      expect(message).toContain('Cursor');
      expect(message).toContain('atelier remove --harness cursor');
      expect(message).toContain('3.7.0');
      expect(message).toContain('config.json');
    }
  });

  test('readConfig rejects unsupported plan_thinking in a current-format OpenCode config', async () => {
    const { writeFileSync, mkdirSync } = await import('fs');
    const { readConfig } = await import('./config.js');
    const configPath = join(tempDir, '.atelier/config.json');
    mkdirSync(join(tempDir, '.atelier'), { recursive: true });
    writeFileSync(configPath, JSON.stringify({
      version: '0.1.0',
      skills_source: 'martinffx/atelier',
      skills_path: '~/.agents/skills',
      opencode: {
        provider: 'opencode-zen',
        default_model: 'opencode/glm-5.3',
        plan_thinking: 'hgih',
        agents: [{ template: 'sentinel', name: 'sentinel', model: 'opencode/glm-5.3-flash' }],
      },
    }));

    const result = readConfig(configPath);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe('invalid');
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
          { template: 'sentinel', name: 'sentinel', model: 'haiku' },
          { template: 'oracle', name: 'oracle', model: 'opus' },
          { template: 'architect', name: 'architect', model: 'sonnet' },
        ],
      },
      codex: {
        default_model: 'gpt-5.6-terra',
        agents: [
          { template: 'sentinel', name: 'sentinel', model: 'gpt-5.6-luna' },
          { template: 'oracle', name: 'oracle', model: 'gpt-5.6-sol' },
          { template: 'architect', name: 'architect', model: 'gpt-5.6-sol' },
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
        agents: [{ template: 'sentinel', name: 'sentinel', model: 'haiku' }],
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
