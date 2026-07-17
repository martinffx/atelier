import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as os from 'os';
import * as TOML from 'smol-toml';

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

  test('throws when invalid --harness is provided', async () => {
    await init({ yes: true, harness: 'claude' });
    await expect(update({ harness: 'foobar' })).rejects.toThrow(
      'Invalid harness "foobar". Must be claude, opencode, or codex.'
    );
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

  test('does not persist config when user cancels the confirm prompt', async () => {
    await init({ yes: true, harness: 'codex' });

    const configBefore = JSON.parse(readFileSync(join(tempDir, '.atelier/config.json'), 'utf-8'));

    inquirerAnswers = {
      default_model: 'gpt-5.6-luna',
      recon: 'gpt-5.6-luna',
      oracle: 'gpt-5.6-luna',
      architect: 'gpt-5.6-luna',
      confirm: false,
    };
    await update({ harness: 'codex' });

    const configAfter = JSON.parse(readFileSync(join(tempDir, '.atelier/config.json'), 'utf-8'));
    expect(configAfter).toEqual(configBefore);
  });

  test('prompts for harness when none is provided', async () => {
    await init({ yes: true, harness: 'claude' });
    await init({ yes: true, harness: 'codex' });

    rmSync(join(tempDir, '.codex/agents/recon.toml'));

    inquirerAnswers = {
      harness: 'codex',
      default_model: 'gpt-5.6-terra',
      recon: 'gpt-5.6-luna',
      oracle: 'gpt-5.6-sol',
      architect: 'gpt-5.6-sol',
      confirm: true,
    };
    await update({});

    expect(existsSync(join(tempDir, '.codex/agents/recon.toml'))).toBe(true);
  });
});

describe('remove', () => {
  test('throws when no config exists', async () => {
    await expect(remove({ harness: 'codex' })).rejects.toThrow('.atelier/config.json not found');
  });

  test('throws when invalid --harness is provided', async () => {
    await init({ yes: true, harness: 'claude' });
    await expect(remove({ harness: 'foobar' })).rejects.toThrow(
      'Invalid harness "foobar". Must be claude, opencode, or codex.'
    );
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

  test('preserves custom keys in .codex/config.toml when removing codex', async () => {
    await init({ yes: true, harness: 'claude' });
    await init({ yes: true, harness: 'codex' });

    const configTomlPath = join(tempDir, '.codex/config.toml');
    const existing = TOML.parse(readFileSync(configTomlPath, 'utf-8')) as Record<string, unknown>;
    existing.custom_field = 'preserved';
    writeFileSync(configTomlPath, TOML.stringify(existing));

    await remove({ harness: 'codex' });

    expect(existsSync(configTomlPath)).toBe(true);
    const after = TOML.parse(readFileSync(configTomlPath, 'utf-8')) as Record<string, unknown>;
    expect(after.custom_field).toBe('preserved');
    expect(after.model).toBeUndefined();
    expect(after.model_reasoning_effort).toBeUndefined();
  });

  test('preserves custom keys in .claude/settings.json when removing claude', async () => {
    await init({ yes: true, harness: 'claude' });
    await init({ yes: true, harness: 'codex' });

    const settingsPath = join(tempDir, '.claude/settings.json');
    const existing = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    existing.custom_field = 'preserved';
    writeFileSync(settingsPath, JSON.stringify(existing, null, 2));

    await remove({ harness: 'claude' });

    expect(existsSync(settingsPath)).toBe(true);
    const after = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(after.custom_field).toBe('preserved');
    expect(after.model).toBeUndefined();
    expect(after.$schema).toBeUndefined();
  });

  test('preserves custom keys in opencode.json when removing opencode', async () => {
    await init({ yes: true, harness: 'opencode' });
    await init({ yes: true, harness: 'claude' });

    const opencodeJsonPath = join(tempDir, '.config', 'opencode', 'opencode.json');
    const existing = JSON.parse(readFileSync(opencodeJsonPath, 'utf-8'));
    existing.custom_field = 'preserved';
    writeFileSync(opencodeJsonPath, JSON.stringify(existing, null, 2));

    await remove({ harness: 'opencode' });

    expect(existsSync(opencodeJsonPath)).toBe(true);
    const after = JSON.parse(readFileSync(opencodeJsonPath, 'utf-8'));
    expect(after.custom_field).toBe('preserved');
    expect(after.agent?.build).toBeUndefined();
    expect(after.agent?.plan).toBeUndefined();
  });

  test('throws on malformed .claude/settings.json during removal', async () => {
    await init({ yes: true, harness: 'claude' });
    await init({ yes: true, harness: 'codex' });

    const settingsPath = join(tempDir, '.claude/settings.json');
    writeFileSync(settingsPath, 'not valid json');

    await expect(remove({ harness: 'claude' })).rejects.toThrow('Failed to parse');
  });

  test('throws on malformed .codex/config.toml during removal', async () => {
    await init({ yes: true, harness: 'claude' });
    await init({ yes: true, harness: 'codex' });

    const configTomlPath = join(tempDir, '.codex/config.toml');
    writeFileSync(configTomlPath, 'not valid toml');

    await expect(remove({ harness: 'codex' })).rejects.toThrow('Failed to parse');
  });

  test('prompts for harness when none is provided', async () => {
    await init({ yes: true, harness: 'claude' });
    await init({ yes: true, harness: 'codex' });

    inquirerAnswers = { harness: 'codex' };
    await remove({});

    expect(existsSync(join(tempDir, '.codex/agents/recon.toml'))).toBe(false);
    expect(existsSync(join(tempDir, '.claude/settings.json'))).toBe(true);
  });

  test('only removes opencode command files that match user-invocable skills', async () => {
    const opencodeDir = join(tempDir, '.config', 'opencode');
    // Default skills_path is ~/.agents/skills, and homedir is mocked to tempDir
    const skillsDir = join(tempDir, '.agents', 'skills');

    mkdirSync(join(skillsDir, 'spec-brainstorm'), { recursive: true });
    mkdirSync(join(skillsDir, 'oracle-architect'), { recursive: true });

    writeFileSync(
      join(skillsDir, 'spec-brainstorm', 'SKILL.md'),
      '---\nname: spec-brainstorm\ndescription: Conversational design workshop\nuser-invocable: true\n---\n# Skill'
    );
    writeFileSync(
      join(skillsDir, 'oracle-architect', 'SKILL.md'),
      '---\nname: oracle-architect\ndescription: DDD patterns\nuser-invocable: false\n---\n# Skill'
    );

    await init({ yes: true, harness: 'opencode' });
    expect(existsSync(join(opencodeDir, 'command/spec-brainstorm.md'))).toBe(true);
    expect(existsSync(join(opencodeDir, 'command/oracle-architect.md'))).toBe(false);

    // Create a custom command file that atelier did not create
    mkdirSync(join(opencodeDir, 'command'), { recursive: true });
    writeFileSync(join(opencodeDir, 'command/custom-cmd.md'), 'custom command');

    await remove({ harness: 'opencode' });

    expect(existsSync(join(opencodeDir, 'command/spec-brainstorm.md'))).toBe(false);
    expect(existsSync(join(opencodeDir, 'command/custom-cmd.md'))).toBe(true);
  });
});
