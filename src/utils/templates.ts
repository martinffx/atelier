import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import type { Provider } from '../types.js';
import { providerModels, defaultModels } from '../models.js';

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
  return ['recon', 'oracle', 'architect'].map(name => readTemplate(name));
}

export function getDeveloperInstructions(name: string): string {
  return readTemplate(name).body;
}

export function getModelsForProvider(provider: Provider): readonly string[] {
  return providerModels[provider];
}

export function getDefaultModel(provider: Provider, agentName: string): string {
  return defaultModels[provider][agentName];
}
