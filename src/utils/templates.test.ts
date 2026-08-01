import { describe, expect, it } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { readUserInvocableSkills } from './templates.js';

function writeSkill(dir: string, name: string, content: string): void {
  const skillDir = join(dir, name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, 'SKILL.md'), content);
}

describe('readUserInvocableSkills', () => {
  it('returns empty results for a missing skills directory', () => {
    const missing = join(tmpdir(), `atelier-missing-skills-${Date.now()}`);

    expect(readUserInvocableSkills(missing)).toEqual({ skills: [], warnings: [] });
  });

  it('supports linked skill directories and warns for invalid metadata files', () => {
    const basePath = mkdtempSync(join(tmpdir(), 'atelier-skills-'));
    const skillsPath = join(basePath, 'skills');
    const sourcePath = join(basePath, 'source');
    try {
      writeSkill(sourcePath, 'linked-skill', '---\nname: linked-skill\ndescription: Linked\nuser-invocable: true\n---\n');
      mkdirSync(skillsPath, { recursive: true });
      symlinkSync(join(sourcePath, 'linked-skill'), join(skillsPath, 'linked-skill'));
      writeSkill(skillsPath, 'malformed', '---\nname: malformed\nuser-invocable: true\n---\n');
      writeSkill(skillsPath, 'oversized', `---\nname: oversized\ndescription: Oversized\nuser-invocable: true\n---\n${'x'.repeat(1024 * 1024)}`);

      const discovery = readUserInvocableSkills(skillsPath);

      expect(discovery.skills).toEqual([{ name: 'linked-skill', description: 'Linked' }]);
      expect(discovery.warnings).toHaveLength(2);
      expect(discovery.warnings.some(warning => warning.includes('malformed'))).toBe(true);
      expect(discovery.warnings.some(warning => warning.includes('oversized'))).toBe(true);
    } finally {
      rmSync(basePath, { recursive: true, force: true });
    }
  });
});
