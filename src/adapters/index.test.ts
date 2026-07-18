import { describe, it, expect } from 'bun:test';
import '../adapters/index.js';
import { getAdapter, listAdapters, listHarnessNames } from '../registry.js';

describe('adapters/index', () => {
  it('registers all three harness adapters', () => {
    expect(listHarnessNames()).toEqual(['claude', 'opencode', 'codex']);
  });

  it('each adapter has the required interface', () => {
    for (const adapter of listAdapters()) {
      expect(adapter.name).toBeDefined();
      expect(adapter.configSchema).toBeDefined();
      expect(typeof adapter.defaultSection).toBe('function');
      expect(typeof adapter.modelsForProvider).toBe('function');
      expect(typeof adapter.installAgents).toBe('function');
      expect(typeof adapter.mergeHarnessConfig).toBe('function');
      expect(typeof adapter.fileList).toBe('function');
      expect(typeof adapter.remove).toBe('function');
    }
  });

  it('returns the correct adapter per harness', () => {
    expect(getAdapter('claude').name).toBe('claude');
    expect(getAdapter('opencode').name).toBe('opencode');
    expect(getAdapter('codex').name).toBe('codex');
  });
});
