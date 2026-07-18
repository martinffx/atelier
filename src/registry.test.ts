import { describe, it, expect } from 'bun:test';
import { registerAdapter, getAdapter, listAdapters, listHarnessNames } from './registry.js';
import type { HarnessAdapter } from '../types.js';

const stubAdapter = (name: HarnessAdapter['name']): HarnessAdapter => ({
  name,
  configSchema: {} as unknown as HarnessAdapter['configSchema'],
  defaultSection: () => ({ default_model: 'x', agents: [] }),
  modelsForProvider: () => ['x'],
  promptSection: async () => ({ default_model: 'x', agents: [] }),
  installAgents: () => {},
  mergeHarnessConfig: () => {},
  fileList: () => [],
  remove: () => {},
});

describe('registry', () => {
  it('registerAdapter and getAdapter round-trip', () => {
    const adapter = stubAdapter('claude');
    registerAdapter(adapter);
    expect(getAdapter('claude')).toBe(adapter);
  });

  it('listAdapters returns registered adapters', () => {
    registerAdapter(stubAdapter('opencode'));
    expect(listAdapters().map(a => a.name)).toContain('opencode');
  });

  it('listHarnessNames returns registered names', () => {
    expect(listHarnessNames()).toContain('claude');
  });

  it('getAdapter throws for unknown harness', () => {
    expect(() => getAdapter('codex')).toThrow();
  });
});
