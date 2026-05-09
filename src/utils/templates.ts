import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import type { Harness } from '../types.js';
import { claudModels, opencodeModels, defaultModels } from '../models.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = join(__dirname, '..', 'agents');

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
  return ['scout', 'oracle', 'architect'].map(name => readTemplate(name));
}

export function getModelsForHarness(harness: Harness): readonly string[] {
  return harness === 'claude' ? claudModels : opencodeModels;
}

export function getDefaultModel(harness: Harness, agentName: string): string {
  return defaultModels[harness][agentName as keyof typeof defaultModels[typeof harness]];
}