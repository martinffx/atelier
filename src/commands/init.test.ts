import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
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

import '../adapters/index.js';
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

  test('prints the OpenAI authentication command after initialization', async () => {
    inquirerAnswers = {
      provider: 'openai',
      build_model: 'openai/gpt-5.6-terra',
      plan_model: 'openai/gpt-5.6-sol',
      recon: 'openai/gpt-5.6-luna',
      oracle: 'openai/gpt-5.6-sol',
      architect: 'openai/gpt-5.6-sol',
      confirm: true,
    };
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));

    try {
      await init({ harness: 'opencode' });
    } finally {
      console.log = originalLog;
    }

    expect(logs).toContain('  opencode auth login --provider openai  # connect your OpenAI account');
  });

  test('throws when --yes is used without --harness', async () => {
    await expect(init({ yes: true })).rejects.toThrow(
       '`--yes` requires `--harness` (claude, opencode, codex, or cursor).'
    );
  });

  test('throws when invalid --harness is provided', async () => {
    await expect(init({ harness: 'foobar' })).rejects.toThrow(
       'Invalid harness "foobar". Must be claude, opencode, codex, or cursor.'
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

  test('creates Cursor agents without modifying native Cursor config', async () => {
    const nativeConfig = join(tempDir, '.cursor/cli-config.json');
    mkdirSync(join(tempDir, '.cursor'), { recursive: true });
    writeFileSync(nativeConfig, '{"model":"user-managed"}\n');
    await init({ yes: true, harness: 'cursor' });

    expect(readFileSync(nativeConfig, 'utf-8')).toBe('{"model":"user-managed"}\n');
    expect(existsSync(join(tempDir, '.cursor/agents/recon.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.cursor/agents/oracle.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.cursor/agents/architect.md'))).toBe(true);

    const config = JSON.parse(readFileSync(join(tempDir, '.atelier/config.json'), 'utf-8'));
    expect(config.cursor.agents).toHaveLength(3);
  });

  test('cancels when confirm prompt is false', async () => {
    inquirerAnswers = {
      harness: 'claude',
      default_model: 'opusplan',
      recon: 'haiku',
      oracle: 'opus',
      architect: 'opus',
      confirm: false,
    };

    await init({});

    expect(existsSync(join(tempDir, '.atelier/config.json'))).toBe(false);
    expect(existsSync(join(tempDir, '.claude/settings.json'))).toBe(false);
    expect(existsSync(join(tempDir, '.claude/agents/recon.md'))).toBe(false);
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
