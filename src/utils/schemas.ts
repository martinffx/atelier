import { z } from 'zod';
import { AGENT_NAMES } from '../constants.js';
import { THINKING_LEVELS, thinkingChoices, type ThinkingHarness } from './thinking.js';

export const ThinkingSchema = z.enum(THINKING_LEVELS);

export const AgentSchema = z.object({
  template: z.enum(AGENT_NAMES),
  name: z.enum(AGENT_NAMES),
  model: z.string().min(1),
});

const ThinkingAgentSchema = AgentSchema.extend({ thinking: ThinkingSchema.optional() });

export const SimpleConfigSchema = z.object({
  provider: z.string().optional(),
  default_model: z.string().min(1),
  build_thinking: ThinkingSchema.optional(),
  plan_thinking: ThinkingSchema.optional(),
  agents: z.array(ThinkingAgentSchema).min(1),
});

export const CursorConfigSchema = z.object({
  agents: z.array(AgentSchema).min(1),
}).strict();

export const OPENCODE_PROVIDERS = ['opencode-zen', 'opencode-go', 'amazon-bedrock', 'openai'] as const;

export const OpenCodeConfigSchema = z.object({
  provider: z.enum(OPENCODE_PROVIDERS),
  build_model: z.string().min(1),
  plan_model: z.string().min(1),
  build_thinking: ThinkingSchema.optional(),
  plan_thinking: ThinkingSchema.optional(),
  agents: z.array(ThinkingAgentSchema).min(1),
}).superRefine((config, ctx) => checkThinking('opencode', config, ctx));

export const ClaudeConfigSchema = SimpleConfigSchema.superRefine((config, ctx) => {
  checkThinking('claude', config, ctx);
  if (config.default_model !== 'opusplan' && config.plan_thinking !== undefined && config.plan_thinking !== config.build_thinking) {
    ctx.addIssue({ code: 'custom', path: ['plan_thinking'], message: 'Separate Claude Plan/Build thinking requires opusplan' });
  }
});
export const CodexConfigSchema = SimpleConfigSchema.superRefine((config, ctx) => checkThinking('codex', config, ctx));

function checkThinking(harness: ThinkingHarness, config: z.infer<typeof SimpleConfigSchema> | { build_model: string; plan_model: string; build_thinking?: z.infer<typeof ThinkingSchema>; plan_thinking?: z.infer<typeof ThinkingSchema>; agents: z.infer<typeof ThinkingAgentSchema>[] }, ctx: z.RefinementCtx): void {
  const check = (model: string, thinking: z.infer<typeof ThinkingSchema> | undefined, path: (string | number)[], session = false) => {
    if (thinking !== undefined && !thinkingChoices(harness, model, session).includes(thinking)) {
      ctx.addIssue({ code: 'custom', path, message: `${model} does not support ${thinking} thinking` });
    }
  };
  check('default_model' in config ? config.default_model : config.build_model, config.build_thinking, ['build_thinking'], true);
  check('default_model' in config ? config.default_model : config.plan_model, config.plan_thinking, ['plan_thinking'], true);
  config.agents.forEach((agent, i) => check(agent.model, agent.thinking, ['agents', i, 'thinking']));
}
