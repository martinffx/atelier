import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as os from 'os';

let inquirerAnswers: Record<string, unknown> = {};

// Hoisted mock: prevents interactive hangs during tests
mock.module('inquirer', () => ({
  default: {
    prompt: async () => inquirerAnswers,
  },
}));

mock.module('os', () => ({
  ...os,
  homedir: () => tempDir,
}));

import { init } from './init.js';
import { update } from './update.js';
import { remove } from './remove.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'atelier-init-test-'));
  inquirerAnswers = {};
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('init', () => {
  test('creates claude config and files with --yes', async () => {
    await init({ yes: true, harness: 'claude' });

    expect(existsSync(join(tempDir, '.atelier/config.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude/settings.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude/agents/recon.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude/agents/oracle.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude/agents/architect.md'))).toBe(true);

    const config = JSON.parse(readFileSync(join(tempDir, '.atelier/config.json'), 'utf-8'));
    expect(config.claude).toBeDefined();
    expect(config.claude.provider).toBe('anthropic');
    expect(config.opencode).toBeUndefined();
    expect(config.codex).toBeUndefined();
    expect(config.claude.agents).toHaveLength(3);
  });

  test('creates opencode config and files with --yes', async () => {
    await init({ yes: true, harness: 'opencode' });

    const opencodeDir = join(tempDir, '.config', 'opencode');

    expect(existsSync(join(tempDir, '.atelier/config.json'))).toBe(true);
    expect(existsSync(join(opencodeDir, 'opencode.json'))).toBe(true);
    expect(existsSync(join(opencodeDir, 'agent/recon.md'))).toBe(true);
    expect(existsSync(join(opencodeDir, 'plugins/atelier.js'))).toBe(false);

    const config = JSON.parse(readFileSync(join(tempDir, '.atelier/config.json'), 'utf-8'));
    expect(config.opencode).toBeDefined();
    expect(config.opencode.provider).toBe('opencode-zen');
  });

  test('creates codex config and files with --yes', async () => {
    await init({ yes: true, harness: 'codex' });

    expect(existsSync(join(tempDir, '.atelier/config.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.codex/config.toml'))).toBe(true);
    expect(existsSync(join(tempDir, '.codex/agents/recon.toml'))).toBe(true);
    expect(existsSync(join(tempDir, '.codex/agents/oracle.toml'))).toBe(true);
    expect(existsSync(join(tempDir, '.codex/agents/architect.toml'))).toBe(true);

    const config = JSON.parse(readFileSync(join(tempDir, '.atelier/config.json'), 'utf-8'));
    expect(config.codex).toBeDefined();
    expect(config.codex.provider).toBe('openai');
    expect(config.codex.default_model).toBe('gpt-5.6-terra');
    expect(config.codex.agents).toHaveLength(3);
  });

  test('adds a second harness without removing the first', async () => {
    await init({ yes: true, harness: 'claude' });
    expect(existsSync(join(tempDir, '.claude/settings.json'))).toBe(true);

    await init({ yes: true, harness: 'codex' });

    expect(existsSync(join(tempDir, '.claude/settings.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.codex/config.toml'))).toBe(true);

    const config = JSON.parse(readFileSync(join(tempDir, '.atelier/config.json'), 'utf-8'));
    expect(config.claude).toBeDefined();
    expect(config.codex).toBeDefined();
    expect(config.claude.agents).toHaveLength(3);
    expect(config.codex.agents).toHaveLength(3);
  });

  test('defaults to opencode-zen provider in --yes mode', async () => {
    await init({ yes: true, harness: 'opencode' });

    const config = JSON.parse(readFileSync(join(tempDir, '.atelier/config.json'), 'utf-8'));
    expect(config.opencode.provider).toBe('opencode-zen');
  });

  test('prompts for provider and creates config', async () => {
    inquirerAnswers = {
      provider: 'opencode-go',
      build_model: 'opencode-go/deepseek-v4-flash',
      plan_model: 'opencode-go/deepseek-v4-pro',
      recon: 'opencode-go/deepseek-v4-flash',
      oracle: 'opencode-go/kimi-k2.6',
      architect: 'opencode-go/deepseek-v4-pro',
      confirm: true,
    };

    await init({ harness: 'opencode' });

    const opencodeDir = join(tempDir, '.config', 'opencode');

    const config = JSON.parse(readFileSync(join(tempDir, '.atelier/config.json'), 'utf-8'));
    expect(config.opencode).toBeDefined();
    expect(config.opencode.provider).toBe('opencode-go');
    expect(existsSync(join(opencodeDir, 'agent/recon.md'))).toBe(true);
  });

  test('throws when --yes is used without --harness', async () => {
    await expect(init({ yes: true })).rejects.toThrow(
      '`--yes` requires `--harness` (claude, opencode, or codex).'
    );
  });

  test('throws when invalid --harness is provided', async () => {
    await expect(init({ harness: 'foobar' })).rejects.toThrow(
      'Invalid harness "foobar". Must be claude, opencode, or codex.'
    );
  });

  test('prompts for harness and creates config interactively', async () => {
    inquirerAnswers = {
      harness: 'codex',
      default_model: 'gpt-5.6-terra',
      recon: 'gpt-5.6-luna',
      oracle: 'gpt-5.6-sol',
      architect: 'gpt-5.6-sol',
      confirm: true,
    };

    await init({});

    expect(existsSync(join(tempDir, '.atelier/config.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.codex/config.toml'))).toBe(true);

    const config = JSON.parse(readFileSync(join(tempDir, '.atelier/config.json'), 'utf-8'));
    expect(config.codex).toBeDefined();
    expect(config.codex.default_model).toBe('gpt-5.6-terra');
  });
});

describe('update', () => {
  test('throws when no config exists', async () => {
    await expect(update({ harness: 'claude' })).rejects.toThrow(
      '.atelier/config.json not found'
    );
  });

  test('regenerates claude files', async () => {
    await init({ yes: true, harness: 'claude' });
    expect(existsSync(join(tempDir, '.claude/settings.json'))).toBe(true);

    // Delete a file to prove regeneration
    rmSync(join(tempDir, '.claude/settings.json'));
    expect(existsSync(join(tempDir, '.claude/settings.json'))).toBe(false);

    inquirerAnswers = {
      default_model: 'opusplan',
      recon: 'haiku',
      oracle: 'opus',
      architect: 'sonnet',
      confirm: true,
    };
    await update({ harness: 'claude' });
    expect(existsSync(join(tempDir, '.claude/settings.json'))).toBe(true);
  });

  test('regenerates opencode files', async () => {
    const opencodeDir = join(tempDir, '.config', 'opencode');

    await init({ yes: true, harness: 'opencode' });
    expect(existsSync(join(opencodeDir, 'opencode.json'))).toBe(true);

    rmSync(join(opencodeDir, 'opencode.json'));
    expect(existsSync(join(opencodeDir, 'opencode.json'))).toBe(false);

    inquirerAnswers = {
      provider: 'opencode-zen',
      build_model: 'opencode/deepseek-v4-flash',
      plan_model: 'opencode/deepseek-v4-pro',
      recon: 'opencode/minimax-m2.7',
      oracle: 'opencode/kimi-k2.6',
      architect: 'opencode/deepseek-v4-pro',
      confirm: true,
    };
    await update({ harness: 'opencode' });
    expect(existsSync(join(opencodeDir, 'opencode.json'))).toBe(true);
  });
});

describe('remove', () => {
  test('throws when no config exists', async () => {
    await expect(remove({ harness: 'claude' })).rejects.toThrow(
      '.atelier/config.json not found'
    );
  });

  test('removes claude files', async () => {
    await init({ yes: true, harness: 'claude' });
    expect(existsSync(join(tempDir, '.claude/agents'))).toBe(true);
    expect(existsSync(join(tempDir, '.atelier'))).toBe(true);

    await remove({ harness: 'claude' });

    expect(existsSync(join(tempDir, '.claude/agents/recon.md'))).toBe(false);
    expect(existsSync(join(tempDir, '.claude/agents/oracle.md'))).toBe(false);
    expect(existsSync(join(tempDir, '.claude/agents/architect.md'))).toBe(false);
    expect(existsSync(join(tempDir, '.atelier'))).toBe(false);
  });

  test('removes opencode files', async () => {
    const opencodeDir = join(tempDir, '.config', 'opencode');

    await init({ yes: true, harness: 'opencode' });
    expect(existsSync(join(opencodeDir, 'agent'))).toBe(true);
    expect(existsSync(join(tempDir, '.atelier'))).toBe(true);

    await remove({ harness: 'opencode' });

    expect(existsSync(join(opencodeDir, 'agent/recon.md'))).toBe(false);
    expect(existsSync(join(opencodeDir, 'plugins/atelier.js'))).toBe(false);
    expect(existsSync(join(opencodeDir, 'opencode.json'))).toBe(false);
    expect(existsSync(join(tempDir, '.atelier'))).toBe(false);
  });

  test('removes codex files', async () => {
    await init({ yes: true, harness: 'codex' });
    expect(existsSync(join(tempDir, '.codex/agents'))).toBe(true);
    expect(existsSync(join(tempDir, '.atelier'))).toBe(true);

    await remove({ harness: 'codex' });

    expect(existsSync(join(tempDir, '.codex/agents/recon.toml'))).toBe(false);
    expect(existsSync(join(tempDir, '.codex/agents/oracle.toml'))).toBe(false);
    expect(existsSync(join(tempDir, '.codex/agents/architect.toml'))).toBe(false);
    expect(existsSync(join(tempDir, '.codex/config.toml'))).toBe(false);
    expect(existsSync(join(tempDir, '.atelier'))).toBe(false);
  });
});
