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
  tempDir = mkdtempSync(join(tmpdir(), 'atelier-update-remove-test-'));
  inquirerAnswers = {};
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('update', () => {
  test('throws when no config exists', async () => {
    await expect(update({ harness: 'codex' })).rejects.toThrow('.atelier/config.json not found');
  });

  test('regenerates codex files without touching claude files', async () => {
    await init({ yes: true, harness: 'claude' });
    await init({ yes: true, harness: 'codex' });

    expect(existsSync(join(tempDir, '.claude/settings.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.codex/config.toml'))).toBe(true);
    expect(existsSync(join(tempDir, '.codex/agents/recon.toml'))).toBe(true);

    const claudeSettingsBefore = readFileSync(join(tempDir, '.claude/settings.json'), 'utf-8');

    // Delete a codex file to prove regeneration
    rmSync(join(tempDir, '.codex/agents/recon.toml'));
    expect(existsSync(join(tempDir, '.codex/agents/recon.toml'))).toBe(false);

    inquirerAnswers = {
      default_model: 'gpt-5.6-terra',
      recon: 'gpt-5.6-luna',
      oracle: 'gpt-5.6-sol',
      architect: 'gpt-5.6-sol',
      confirm: true,
    };
    await update({ harness: 'codex' });

    expect(existsSync(join(tempDir, '.codex/agents/recon.toml'))).toBe(true);
    expect(existsSync(join(tempDir, '.codex/agents/oracle.toml'))).toBe(true);
    expect(existsSync(join(tempDir, '.codex/agents/architect.toml'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude/settings.json'))).toBe(true);

    const claudeSettingsAfter = readFileSync(join(tempDir, '.claude/settings.json'), 'utf-8');
    expect(claudeSettingsAfter).toBe(claudeSettingsBefore);
  });
});

describe('remove', () => {
  test('throws when no config exists', async () => {
    await expect(remove({ harness: 'codex' })).rejects.toThrow('.atelier/config.json not found');
  });

  test('removes only codex files and section, leaving claude untouched', async () => {
    await init({ yes: true, harness: 'claude' });
    await init({ yes: true, harness: 'codex' });

    expect(existsSync(join(tempDir, '.claude'))).toBe(true);
    expect(existsSync(join(tempDir, '.codex/agents/recon.toml'))).toBe(true);

    await remove({ harness: 'codex' });

    // Codex agent files removed
    expect(existsSync(join(tempDir, '.codex/agents/recon.toml'))).toBe(false);
    expect(existsSync(join(tempDir, '.codex/agents/oracle.toml'))).toBe(false);
    expect(existsSync(join(tempDir, '.codex/agents/architect.toml'))).toBe(false);

    // Claude files untouched
    expect(existsSync(join(tempDir, '.claude/settings.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude/agents/recon.md'))).toBe(true);

    // Config: claude section preserved, codex section removed
    const config = JSON.parse(readFileSync(join(tempDir, '.atelier/config.json'), 'utf-8'));
    expect(config.claude).toBeDefined();
    expect(config.codex).toBeUndefined();
  });
});
