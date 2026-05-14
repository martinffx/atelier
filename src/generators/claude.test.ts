import { describe, test, expect, afterEach, beforeEach } from 'bun:test';
import { mkdtempSync, rmSync, readFileSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

let tempDir: string;

const testConfig = {
  version: '1.0.0' as const,
  harness: 'claude' as const,
  skills_source: 'martinffx/atelier',
  skills_path: '~/.agents/skills/atelier',
  agents: [
    { template: 'recon', name: 'recon', model: 'haiku' },
    { template: 'oracle', name: 'oracle', model: 'opus' },
    { template: 'architect', name: 'architect', model: 'sonnet' },
  ],
};

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'atelier-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('generateClaude', () => {
  test('creates .claude directory structure', async () => {
    const { generateClaude } = await import('./claude.js');
    generateClaude(testConfig, tempDir);

    expect(statSync(join(tempDir, '.claude')).isDirectory()).toBe(true);
    expect(statSync(join(tempDir, '.claude/agents')).isDirectory()).toBe(true);
    expect(statSync(join(tempDir, 'hooks')).isDirectory()).toBe(true);
  });

  test('writes settings.json with model and hooks', async () => {
    const { generateClaude } = await import('./claude.js');
    generateClaude(testConfig, tempDir);

    const settingsPath = join(tempDir, '.claude/settings.json');
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

    expect(settings.model).toBe('opusplan');
    expect(settings.hooks.SessionStart).toBeDefined();
    expect(settings.hooks.SessionStart[0].hooks[0].command).toBe('hooks/atelier-session-start');
    expect(settings.hooks.SessionStart[0].matcher).toBe('startup|clear|compact');
  });

  test('writes hook script with correct skills path', async () => {
    const { generateClaude } = await import('./claude.js');
    generateClaude(testConfig, tempDir);

    const hookPath = join(tempDir, 'hooks/atelier-session-start');
    const script = readFileSync(hookPath, 'utf-8');

    expect(script).toContain("SKILLS_DIR='~/.agents/skills/atelier'");
    expect(script).toContain('atelier');
  });

  test('hook script is executable', async () => {
    const { generateClaude } = await import('./claude.js');
    generateClaude(testConfig, tempDir);

    const hookPath = join(tempDir, 'hooks/atelier-session-start');
    const mode = statSync(hookPath).mode;
    expect(mode & 0o111).not.toBe(0);
  });

  test('writes agent files with correct frontmatter', async () => {
    const { generateClaude } = await import('./claude.js');
    generateClaude(testConfig, tempDir);

    const reconPath = join(tempDir, '.claude/agents/recon.md');
    const content = readFileSync(reconPath, 'utf-8');

    expect(content.startsWith('---\nname: recon\ndescription:')).toBe(true);
    expect(content).toContain('model: haiku');
    expect(content).toContain('**Recon**');

    const oraclePath = join(tempDir, '.claude/agents/oracle.md');
    const oracleContent = readFileSync(oraclePath, 'utf-8');
    expect(oracleContent.startsWith('---\nname: oracle\ndescription:')).toBe(true);
    expect(oracleContent).toContain('model: opus');
    expect(oracleContent).toContain('**Oracle**');

    const architectPath = join(tempDir, '.claude/agents/architect.md');
    const architectContent = readFileSync(architectPath, 'utf-8');
    expect(architectContent.startsWith('---\nname: architect\ndescription:')).toBe(true);
    expect(architectContent).toContain('model: sonnet');
  });

  test('merges with existing settings.json', async () => {
    const { generateClaude } = await import('./claude.js');
    const { writeFileSync, mkdirSync } = await import('fs');

    mkdirSync(join(tempDir, '.claude'), { recursive: true });
    writeFileSync(join(tempDir, '.claude/settings.json'), JSON.stringify({
      customField: 'preserved',
      another: 123,
    }));

    generateClaude(testConfig, tempDir);

    const settingsPath = join(tempDir, '.claude/settings.json');
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

    expect(settings.customField).toBe('preserved');
    expect(settings.another).toBe(123);
    expect(settings.model).toBe('opusplan');
  });

  test('running twice does not duplicate hooks', async () => {
    const { generateClaude } = await import('./claude.js');
    const { mkdirSync } = await import('fs');

    mkdirSync(join(tempDir, '.claude'), { recursive: true });

    generateClaude(testConfig, tempDir);
    generateClaude(testConfig, tempDir);
    generateClaude(testConfig, tempDir);

    const settingsPath = join(tempDir, '.claude/settings.json');
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

    const atelierHooks = settings.hooks?.SessionStart?.filter(
      (h: { hooks?: { command?: string }[] }) => h.hooks?.some((hook) => hook.command === 'hooks/atelier-session-start')
    );

    expect(atelierHooks).toHaveLength(1);
  });
});