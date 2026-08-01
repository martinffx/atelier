import { readFileSync, existsSync, readdirSync, lstatSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { AGENT_NAMES } from '../constants.js';
import { SkillDiscoveryError } from './errors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = existsSync(join(__dirname, '..', 'agents'))
  ? join(__dirname, '..', 'agents')
  : join(__dirname, '..', '..', 'agents');

export interface AgentTemplate {
  name: string;
  description: string;
  body: string;
}

export interface UserInvocableSkill {
  name: string;
  description: string;
}

export interface SkillDiscovery {
  skills: UserInvocableSkill[];
  warnings: string[];
}

const MAX_SKILL_FILE_SIZE = 1024 * 1024;

export function readTemplate(name: string): AgentTemplate {
  const filePath = join(AGENTS_DIR, `${name}.md`);
  const raw = readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  return {
    name: data.name as string,
    description: data.description as string,
    body: content.trim(),
  };
}

export function readAllTemplates(): AgentTemplate[] {
  return AGENT_NAMES.map(name => readTemplate(name));
}

export function readUserInvocableSkills(skillsPath: string): SkillDiscovery {
  let entries;
  try {
    entries = readdirSync(skillsPath, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { skills: [], warnings: [] };
    }
    throw new SkillDiscoveryError(skillsPath, err instanceof Error ? err.message : String(err));
  }

  const warnings: string[] = [];
  const skills = entries.flatMap(entry => {
    const skillDir = join(skillsPath, entry.name);
    try {
      if (!entry.isDirectory() && !(entry.isSymbolicLink() && statSync(skillDir).isDirectory())) {
        return [];
      }
      const skillPath = join(skillDir, 'SKILL.md');
      if (!existsSync(skillPath)) {
        return [];
      }
      const stat = lstatSync(skillPath);
      if (!stat.isFile() || stat.size > MAX_SKILL_FILE_SIZE) {
        warnings.push(`Skipped ${skillPath}: expected a regular SKILL.md no larger than ${MAX_SKILL_FILE_SIZE} bytes.`);
        return [];
      }
      const { data } = matter(readFileSync(skillPath, 'utf-8'));
      if (data['user-invocable'] !== true) {
        return [];
      }
      if (
        typeof data.name !== 'string' ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.name) ||
        typeof data.description !== 'string'
      ) {
        warnings.push(`Skipped ${skillPath}: invalid user-invocable skill metadata.`);
        return [];
      }
      return [{ name: data.name, description: data.description }];
    } catch (err) {
      warnings.push(`Skipped ${skillDir}: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }).sort((a, b) => a.name.localeCompare(b.name));

  return { skills: [...new Map(skills.map(skill => [skill.name, skill])).values()], warnings };
}
