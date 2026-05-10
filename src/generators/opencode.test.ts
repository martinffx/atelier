import { describe, test, expect, afterEach, beforeEach } from 'bun:test';
import { mkdtempSync, rmSync, readFileSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

let tempDir: string;

const testConfig = {
  version: '1.0.0' as const,
  harness: 'opencode' as const,
  skills_source: 'martinffx/atelier',
  skills_path: '~/.agents/skills/atelier',
  agents: [
    { template: 'scout', name: 'scout', model: 'opencode/deepseek-v4-flash' },
    { template: 'oracle', name: 'oracle', model: 'opencode-go/kimi-k2.6' },
    { template: 'architect', name: 'architect', model: 'opencode-go/deepseek-v4-pro' },
  ],
};

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'atelier-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('generateOpenCode', () => {
  test('creates .opencode directory structure', async () => {
    const { generateOpenCode } = await import('./opencode.js');
    generateOpenCode(testConfig, tempDir);

    expect(statSync(join(tempDir, '.opencode')).isDirectory()).toBe(true);
    expect(statSync(join(tempDir, '.opencode/agents')).isDirectory()).toBe(true);
    expect(statSync(join(tempDir, '.opencode/plugins')).isDirectory()).toBe(true);
  });

  test('writes opencode.json with primary agent config', async () => {
    const { generateOpenCode } = await import('./opencode.js');
    generateOpenCode(testConfig, tempDir);

    const opencodeJsonPath = join(tempDir, 'opencode.json');
    const config = JSON.parse(readFileSync(opencodeJsonPath, 'utf-8'));

    expect(config.agent).toBeDefined();
    expect(config.agent.build.mode).toBe('primary');
    expect(config.agent.build.model).toBe('opencode/deepseek-v4-flash');
    expect(config.agent.plan.mode).toBe('primary');
    expect(config.agent.plan.model).toBe('opencode/deepseek-v4-pro');
  });

  test('writes plugin with skills path', async () => {
    const { generateOpenCode } = await import('./opencode.js');
    generateOpenCode(testConfig, tempDir);

    const pluginPath = join(tempDir, '.opencode/plugins/atelier.js');
    const plugin = readFileSync(pluginPath, 'utf-8');

    expect(plugin).toContain('skillsDir');
    expect(plugin).toContain('~/.agents/skills/atelier/atelier');
  });

  test('writes agent files with mode: subagent', async () => {
    const { generateOpenCode } = await import('./opencode.js');
    generateOpenCode(testConfig, tempDir);

    const scoutPath = join(tempDir, '.opencode/agents/scout.md');
    const content = readFileSync(scoutPath, 'utf-8');

    expect(content.startsWith('---\nname: scout\nmodel: opencode/deepseek-v4-flash\nmode: subagent\n---')).toBe(true);
    expect(content).toContain('**Scout**');

    const oraclePath = join(tempDir, '.opencode/agents/oracle.md');
    const oracleContent = readFileSync(oraclePath, 'utf-8');
    expect(oracleContent.startsWith('---\nname: oracle\nmodel: opencode-go/kimi-k2.6\nmode: subagent\n---')).toBe(true);
    expect(oracleContent).toContain('**Oracle**');

    const architectPath = join(tempDir, '.opencode/agents/architect.md');
    const architectContent = readFileSync(architectPath, 'utf-8');
    expect(architectContent.startsWith('---\nname: architect\nmodel: opencode-go/deepseek-v4-pro\nmode: subagent\n---')).toBe(true);
    expect(architectContent).toContain('**Architect**');
  });

  test('merges with existing opencode.json', async () => {
    const { generateOpenCode } = await import('./opencode.js');
    const { writeFileSync } = await import('fs');

    writeFileSync(join(tempDir, 'opencode.json'), JSON.stringify({
      customField: 'preserved',
      agent: {
        custom: 'value',
      },
    }));

    generateOpenCode(testConfig, tempDir);

    const opencodeJsonPath = join(tempDir, 'opencode.json');
    const config = JSON.parse(readFileSync(opencodeJsonPath, 'utf-8'));

    expect(config.customField).toBe('preserved');
    expect(config.agent.custom).toBe('value');
    expect(config.agent.build.model).toBe('opencode/deepseek-v4-flash');
  });
});