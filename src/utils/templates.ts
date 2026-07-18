import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { AGENT_NAMES } from '../constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = existsSync(join(__dirname, '..', 'agents'))
  ? join(__dirname, '..', 'agents')
  : join(__dirname, '..', '..', 'agents');

export interface AgentTemplate {
  name: string;
  description: string;
  body: string;
}

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

