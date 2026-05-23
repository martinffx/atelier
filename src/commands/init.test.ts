import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

let inquirerAnswers: Record<string, unknown> = {};
let mockDetectHarnessResult: string | null = null;

// Hoisted mock: prevents interactive hangs during tests
mock.module('inquirer', () => ({
  default: {
    prompt: async () => inquirerAnswers,
  },
}));

mock.module('../utils/detect.js', () => ({
  detectHarness: () => mockDetectHarnessResult,
}));

import { init } from './init.js';
import { update } from './update.js';
import { remove } from './remove.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'atelier-init-test-'));
  inquirerAnswers = {};
  mockDetectHarnessResult = null;
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('init', () => {
  test('creates claude config and files with --yes', async () => {
    mockDetectHarnessResult = 'claude';
    await init({ yes: true, harness: 'claude', cwd: tempDir });

    expect(existsSync(join(tempDir, '.atelier/config.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude/settings.json'))).toBe(true);
    expect(existsSync(join(tempDir, 'hooks/atelier-session-start'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude/agents/recon.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude/agents/oracle.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude/agents/architect.md'))).toBe(true);

    const config = JSON.parse(readFileSync(join(tempDir, '.atelier/config.json'), 'utf-8'));
    expect(config.harness).toBe('claude');
    expect(config.provider).toBeUndefined();
    expect(config.agents).toHaveLength(3);
  });

  test('creates opencode config and files with --yes', async () => {
    mockDetectHarnessResult = 'opencode';
    await init({ yes: true, harness: 'opencode', cwd: tempDir });

    expect(existsSync(join(tempDir, '.atelier/config.json'))).toBe(true);
    expect(existsSync(join(tempDir, 'opencode.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.opencode/plugins/atelier.js'))).toBe(true);
    expect(existsSync(join(tempDir, '.opencode/agent/recon.md'))).toBe(true);

    const config = JSON.parse(readFileSync(join(tempDir, '.atelier/config.json'), 'utf-8'));
    expect(config.harness).toBe('opencode');
    expect(config.provider).toBe('opencode-zen');
  });

  test('defaults to opencode-zen provider in --yes mode', async () => {
    mockDetectHarnessResult = 'opencode';
    await init({ yes: true, harness: 'opencode', cwd: tempDir });

    const config = JSON.parse(readFileSync(join(tempDir, '.atelier/config.json'), 'utf-8'));
    expect(config.provider).toBe('opencode-zen');
  });

  test('prompts for provider and creates config', async () => {
    mockDetectHarnessResult = 'opencode';
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
    expect(config.harness).toBe('opencode');
    expect(config.provider).toBe('opencode-go');
    expect(existsSync(join(tempDir, '.opencode/agent/recon.md'))).toBe(true);
  });

  test('throws when harness not detected and --yes', async () => {
    await expect(init({ yes: true, cwd: tempDir })).rejects.toThrow('Could not detect harness');
  });

  test('uses --project flag for local skills path', async () => {
    mockDetectHarnessResult = 'claude';
    await init({ yes: true, harness: 'claude', project: true, cwd: tempDir });

    const config = JSON.parse(readFileSync(join(tempDir, '.atelier/config.json'), 'utf-8'));
    expect(config.skills_path).toBe('./.agents/skills');
  });
});

describe('update', () => {
  test('throws when no config exists', async () => {
    await expect(update(tempDir)).rejects.toThrow('.atelier/config.json not found');
  });

  test('regenerates claude files', async () => {
    mockDetectHarnessResult = 'claude';
    await init({ yes: true, harness: 'claude', cwd: tempDir });
    expect(existsSync(join(tempDir, '.claude/settings.json'))).toBe(true);

    // Delete a file to prove regeneration
    rmSync(join(tempDir, '.claude/settings.json'));
    expect(existsSync(join(tempDir, '.claude/settings.json'))).toBe(false);

    inquirerAnswers = { confirm: true };
    await update(tempDir);
    expect(existsSync(join(tempDir, '.claude/settings.json'))).toBe(true);
  });

  test('regenerates opencode files', async () => {
    mockDetectHarnessResult = 'opencode';
    await init({ yes: true, harness: 'opencode', cwd: tempDir });
    expect(existsSync(join(tempDir, 'opencode.json'))).toBe(true);

    rmSync(join(tempDir, 'opencode.json'));
    expect(existsSync(join(tempDir, 'opencode.json'))).toBe(false);

    inquirerAnswers = { confirm: true };
    await update(tempDir);
    expect(existsSync(join(tempDir, 'opencode.json'))).toBe(true);
  });
});

describe('remove', () => {
  test('throws when no config exists', async () => {
    expect(() => remove(tempDir)).toThrow('.atelier/config.json not found');
  });

  test('removes claude files', async () => {
    mockDetectHarnessResult = 'claude';
    await init({ yes: true, harness: 'claude', cwd: tempDir });
    expect(existsSync(join(tempDir, '.claude'))).toBe(true);
    expect(existsSync(join(tempDir, '.atelier'))).toBe(true);

    remove(tempDir);

    expect(existsSync(join(tempDir, '.claude'))).toBe(false);
    expect(existsSync(join(tempDir, '.atelier'))).toBe(false);
  });

  test('removes opencode files', async () => {
    mockDetectHarnessResult = 'opencode';
    await init({ yes: true, harness: 'opencode', cwd: tempDir });
    expect(existsSync(join(tempDir, '.opencode'))).toBe(true);
    expect(existsSync(join(tempDir, '.atelier'))).toBe(true);

    remove(tempDir);

    expect(existsSync(join(tempDir, '.opencode'))).toBe(false);
    expect(existsSync(join(tempDir, '.atelier'))).toBe(false);
  });
});
