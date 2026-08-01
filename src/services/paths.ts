import { homedir } from 'os';
import { isAbsolute, join, resolve } from 'path';
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

export function resolveSkillsPath(skillsPath: string): string {
  if (skillsPath === '~') {
    return homedir();
  }
  if (skillsPath.startsWith('~/')) {
    return join(homedir(), skillsPath.slice(2));
  }
  return isAbsolute(skillsPath) ? skillsPath : resolve(skillsPath);
}

export function resolveBasePath(harness: Harness): string {
  return harness === 'opencode' ? getGlobalOpencodeDir() : homedir();
}
