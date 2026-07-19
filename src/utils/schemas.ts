import { z } from 'zod';
import { AGENT_NAMES } from '../constants.js';

export const AgentSchema = z.object({
  template: z.enum(AGENT_NAMES),
  name: z.enum(AGENT_NAMES),
  model: z.string().min(1),
});

export const SimpleConfigSchema = z.object({
  provider: z.string().optional(),
  default_model: z.string().min(1),
  agents: z.array(AgentSchema).min(1),
});

export const CursorConfigSchema = z.object({
  agents: z.array(AgentSchema).min(1),
}).strict();

export const OPENCODE_PROVIDERS = ['opencode-zen', 'opencode-go', 'amazon-bedrock', 'openai'] as const;

export const OpenCodeConfigSchema = z.object({
  provider: z.enum(OPENCODE_PROVIDERS),
  build_model: z.string().min(1),
  plan_model: z.string().min(1),
  agents: z.array(AgentSchema).min(1),
});
