import { homedir } from 'os';
import { join } from 'path';
import type { Harness } from '../types.js';

export function shortPath(p: string): string {
  const home = homedir();
  if (p === home || p.startsWith(home + '/')) {
    return '~' + p.slice(home.length);
  }
  return p;
}

export function getGlobalOpencodeDir(): string {
  return join(homedir(), '.config', 'opencode');
}

export function resolveBasePath(harness: Harness): string {
  return harness === 'opencode' ? getGlobalOpencodeDir() : homedir();
}
