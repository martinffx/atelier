import { describe, it, expect } from 'bun:test';
import { homedir } from 'os';
import { join } from 'path';
import { shortPath, getGlobalOpencodeDir, resolveBasePath } from './paths.js';

describe('paths', () => {
  it('shortPath replaces home with ~', () => {
    expect(shortPath(homedir())).toBe('~');
    expect(shortPath(join(homedir(), '.claude'))).toBe('~/.claude');
  });

  it('shortPath leaves other paths unchanged', () => {
    expect(shortPath('/tmp/foo')).toBe('/tmp/foo');
  });

  it('getGlobalOpencodeDir returns ~/.config/opencode', () => {
    expect(getGlobalOpencodeDir()).toBe(join(homedir(), '.config', 'opencode'));
  });

  it('resolveBasePath uses homedir for claude and codex', () => {
    expect(resolveBasePath('claude')).toBe(homedir());
    expect(resolveBasePath('codex')).toBe(homedir());
  });

  it('resolveBasePath uses global opencode dir for opencode', () => {
    expect(resolveBasePath('opencode')).toBe(getGlobalOpencodeDir());
  });
});
