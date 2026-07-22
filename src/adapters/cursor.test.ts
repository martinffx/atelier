import { describe, it, expect, beforeEach } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { cursorAdapter } from './cursor.js';

describe('cursor adapter', () => {
  let basePath: string;

  beforeEach(() => {
    basePath = mkdtempSync(join(tmpdir(), 'atelier-cursor-'));
  });

  it('uses the approved subagent defaults and focused model picker', () => {
    const section = cursorAdapter.defaultSection();

    expect(section.agents.map(agent => agent.model)).toEqual([
      'composer-2.5',
      'claude-opus-4-8-high',
      'gpt-5.6-sol-medium',
    ]);
    expect(cursorAdapter.modelsForProvider()).toEqual(expect.arrayContaining([
      'cursor-grok-4.5-high',
      'kimi-k2.7-code',
      'glm-5.2-high',
    ]));
  });

  it('writes Cursor Markdown agents without touching native config', () => {
    const nativeConfigPath = join(basePath, '.cursor', 'cli-config.json');
    mkdirSync(join(basePath, '.cursor'), { recursive: true });
    writeFileSync(nativeConfigPath, '{"user":"config"}\n');

    cursorAdapter.mergeHarnessConfig(cursorAdapter.defaultSection(), basePath);
    cursorAdapter.installAgents(cursorAdapter.defaultSection(), basePath);

    const agentPath = join(basePath, '.cursor', 'agents', 'sentinel.md');
    expect(readFileSync(agentPath, 'utf-8')).toContain('model: composer-2.5');
    expect(readFileSync(agentPath, 'utf-8')).toContain('name: sentinel');
    expect(readFileSync(nativeConfigPath, 'utf-8')).toBe('{"user":"config"}\n');
  });

  it('removes only managed agents and preserves native config and user agents', () => {
    const section = cursorAdapter.defaultSection();
    const nativeConfigPath = join(basePath, '.cursor', 'cli-config.json');
    mkdirSync(join(basePath, '.cursor'), { recursive: true });
    writeFileSync(nativeConfigPath, '{"user":"config"}\n');
    cursorAdapter.installAgents(section, basePath);

    const userAgentPath = join(basePath, '.cursor', 'agents', 'user.md');
    writeFileSync(userAgentPath, '---\nname: user\n---\n');
    cursorAdapter.remove(section, basePath);

    expect(existsSync(join(basePath, '.cursor', 'agents', 'sentinel.md'))).toBe(false);
    expect(existsSync(userAgentPath)).toBe(true);
    expect(readFileSync(nativeConfigPath, 'utf-8')).toBe('{"user":"config"}\n');
  });
});
