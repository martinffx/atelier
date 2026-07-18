import { z } from 'zod';
import { AGENT_NAMES } from '../types.js';

export const AgentSchema = z.object({
  template: z.enum(AGENT_NAMES),
  name: z.enum(AGENT_NAMES),
  model: z.string(),
});

export const SimpleConfigSchema = z.object({
  provider: z.string().optional(),
  default_model: z.string(),
  agents: z.array(AgentSchema).min(1),
});

export const OPENCODE_PROVIDERS = ['opencode-zen', 'opencode-go', 'amazon-bedrock'] as const;

export const OpenCodeConfigSchema = z.object({
  provider: z.enum(OPENCODE_PROVIDERS),
  build_model: z.string(),
  plan_model: z.string(),
  agents: z.array(AgentSchema).min(1),
});
