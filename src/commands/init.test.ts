import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

let inquirerAnswers: Record<string, unknown> = {};

// Hoisted mock: prevents interactive hangs during tests
mock.module('inquirer', () => ({
  default: {
    prompt: async () => inquirerAnswers,
  },
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
    await init({ yes: true, harness: 'claude', cwd: tempDir });

    expect(existsSync(join(tempDir, '.atelier/config.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude/settings.json'))).toBe(true);
    expect(existsSync(join(tempDir, 'hooks/atelier-session-start'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude/agents/recon.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude/agents/oracle.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude/agents/architect.md'))).toBe(true);

    const config = JSON.parse(readFileSync(join(tempDir, '.atelier/config.json'), 'utf-8'));
    expect(config.claude).toBeDefined();
    expect(config.opencode).toBeUndefined();
    expect(config.codex).toBeUndefined();
    expect(config.claude.agents).toHaveLength(3);
  });

  test('creates opencode config and files with --yes', async () => {
    await init({ yes: true, harness: 'opencode', cwd: tempDir });

    expect(existsSync(join(tempDir, '.atelier/config.json'))).toBe(true);
    expect(existsSync(join(tempDir, 'opencode.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.opencode/plugins/atelier.js'))).toBe(true);
    expect(existsSync(join(tempDir, '.opencode/agent/recon.md'))).toBe(true);

    const config = JSON.parse(readFileSync(join(tempDir, '.atelier/config.json'), 'utf-8'));
    expect(config.opencode).toBeDefined();
    expect(config.opencode.provider).toBe('opencode-zen');
  });

  test('creates codex config and files with --yes', async () => {
    await init({ yes: true, harness: 'codex', cwd: tempDir });

    expect(existsSync(join(tempDir, '.atelier/config.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.codex/config.toml'))).toBe(true);
    expect(existsSync(join(tempDir, '.codex/agents/recon.toml'))).toBe(true);
    expect(existsSync(join(tempDir, '.codex/agents/oracle.toml'))).toBe(true);
    expect(existsSync(join(tempDir, '.codex/agents/architect.toml'))).toBe(true);

    const config = JSON.parse(readFileSync(join(tempDir, '.atelier/config.json'), 'utf-8'));
    expect(config.codex).toBeDefined();
    expect(config.codex.default_model).toBe('gpt-5.6-terra');
    expect(config.codex.agents).toHaveLength(3);
  });

  test('adds a second harness without removing the first', async () => {
    await init({ yes: true, harness: 'claude', cwd: tempDir });
    expect(existsSync(join(tempDir, '.claude/settings.json'))).toBe(true);

    await init({ yes: true, harness: 'codex', cwd: tempDir });

    expect(existsSync(join(tempDir, '.claude/settings.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.codex/config.toml'))).toBe(true);

    const config = JSON.parse(readFileSync(join(tempDir, '.atelier/config.json'), 'utf-8'));
    expect(config.claude).toBeDefined();
    expect(config.codex).toBeDefined();
    expect(config.claude.agents).toHaveLength(3);
    expect(config.codex.agents).toHaveLength(3);
  });

  test('defaults to opencode-zen provider in --yes mode', async () => {
    await init({ yes: true, harness: 'opencode', cwd: tempDir });

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

    await init({ harness: 'opencode', cwd: tempDir });

    const config = JSON.parse(readFileSync(join(tempDir, '.atelier/config.json'), 'utf-8'));
    expect(config.opencode).toBeDefined();
    expect(config.opencode.provider).toBe('opencode-go');
    expect(existsSync(join(tempDir, '.opencode/agent/recon.md'))).toBe(true);
  });

  test('throws when --yes is used without --harness', async () => {
    await expect(init({ yes: true, cwd: tempDir })).rejects.toThrow(
      '`--yes` requires `--harness` (claude, opencode, or codex).'
    );
  });

  test('uses --project flag for local skills path', async () => {
    await init({ yes: true, harness: 'claude', project: true, cwd: tempDir });

    const config = JSON.parse(readFileSync(join(tempDir, '.atelier/config.json'), 'utf-8'));
    expect(config.skills_path).toBe('./.agents/skills');
  });
});

describe('update', () => {
  test('throws when no config exists', async () => {
    await expect(update({ basePath: tempDir, harness: 'claude' })).rejects.toThrow(
      '.atelier/config.json not found'
    );
  });

  test('regenerates claude files', async () => {
    await init({ yes: true, harness: 'claude', cwd: tempDir });
    expect(existsSync(join(tempDir, '.claude/settings.json'))).toBe(true);

    // Delete a file to prove regeneration
    rmSync(join(tempDir, '.claude/settings.json'));
    expect(existsSync(join(tempDir, '.claude/settings.json'))).toBe(false);

    inquirerAnswers = { confirm: true };
    await update({ basePath: tempDir, harness: 'claude' });
    expect(existsSync(join(tempDir, '.claude/settings.json'))).toBe(true);
  });

  test('regenerates opencode files', async () => {
    await init({ yes: true, harness: 'opencode', cwd: tempDir });
    expect(existsSync(join(tempDir, 'opencode.json'))).toBe(true);

    rmSync(join(tempDir, 'opencode.json'));
    expect(existsSync(join(tempDir, 'opencode.json'))).toBe(false);

    inquirerAnswers = {
      provider: 'opencode-zen',
      build_model: 'opencode/deepseek-v4-flash',
      plan_model: 'opencode/deepseek-v4-pro',
      recon: 'opencode/minimax-m2.7',
      oracle: 'opencode/kimi-k2.6',
      architect: 'opencode/deepseek-v4-pro',
      confirm: true,
    };
    await update({ basePath: tempDir, harness: 'opencode' });
    expect(existsSync(join(tempDir, 'opencode.json'))).toBe(true);
  });
});

describe('remove', () => {
  test('throws when no config exists', async () => {
    await expect(remove({ basePath: tempDir, harness: 'claude' })).rejects.toThrow(
      '.atelier/config.json not found'
    );
  });

  test('removes claude files', async () => {
    await init({ yes: true, harness: 'claude', cwd: tempDir });
    expect(existsSync(join(tempDir, '.claude'))).toBe(true);
    expect(existsSync(join(tempDir, '.atelier'))).toBe(true);

    await remove({ basePath: tempDir, harness: 'claude' });

    expect(existsSync(join(tempDir, '.claude'))).toBe(false);
    expect(existsSync(join(tempDir, '.atelier'))).toBe(false);
  });

  test('removes opencode files', async () => {
    await init({ yes: true, harness: 'opencode', cwd: tempDir });
    expect(existsSync(join(tempDir, '.opencode'))).toBe(true);
    expect(existsSync(join(tempDir, '.atelier'))).toBe(true);

    await remove({ basePath: tempDir, harness: 'opencode' });

    expect(existsSync(join(tempDir, '.opencode'))).toBe(false);
    expect(existsSync(join(tempDir, '.atelier'))).toBe(false);
  });
});
