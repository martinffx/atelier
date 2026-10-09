import { InvalidConfigError } from './errors.js';

export const THINKING_LEVELS = ['default', 'off', 'on', 'low', 'medium', 'high', 'xhigh', 'max'] as const;
export type Thinking = typeof THINKING_LEVELS[number];
export type ThinkingHarness = 'claude' | 'codex' | 'opencode';

// Unknown/custom models remain usable without guessing their capabilities.
export function thinkingChoices(harness: ThinkingHarness, model: string, session = false): Thinking[] {
  const id = model.split('/').at(-1)!.toLowerCase();
  if (/gpt-6-(astra|sol|luna)$/.test(id)) {
    return ['default', ...(id.endsWith('astra') ? [] : ['off'] as const), 'low', 'medium', 'high', 'xhigh', 'max'];
  }
  if (/^(opus|opusplan|sonnet|haiku|fable|best)$/.test(id) || /claude-(opus-5-5|fable-5-1|sonnet-5-5|haiku-5-5)$/.test(id)) {
    return ['default', 'low', 'medium', 'high', 'xhigh', ...(harness === 'claude' && session ? [] : ['max'] as const)];
  }
  if (harness === 'opencode') {
    if (/^(glm-5\.3(-flash)?|kimi-k3|deepseek-v4(\.1-flash|-pro))$/.test(id)) return ['default', 'low', 'high', 'max'];
    if (/^(mimo-v2\.6-(pro|flash)(-free)?|minimax-m3(-free)?)$/.test(id)) return ['default', 'off', 'on'];
  }
  return ['default'];
}

export function assertThinking(harness: ThinkingHarness, model: string, thinking?: Thinking, session = false): void {
  if (thinking !== undefined && !thinkingChoices(harness, model, session).includes(thinking)) {
    throw new InvalidConfigError(`${model} does not support ${thinking} thinking in ${harness}${session ? ' sessions' : ''}`);
  }
}

export function codexThinking(thinking: Thinking | undefined, legacy: string): string | undefined {
  if (thinking === undefined) return legacy;
  if (thinking === 'default') return undefined;
  return thinking === 'off' ? 'none' : thinking;
}

export function claudeModel(model: string): string {
  return ({ opus: 'claude-opus-5-5', fable: 'claude-fable-5-1', best: 'claude-fable-5-1', sonnet: 'claude-sonnet-5-5', haiku: 'claude-haiku-5-5' } as Record<string, string>)[model] ?? model;
}

export function claudeModeModels(model: string): { build: string; plan: string } {
  return model === 'opusplan'
    ? { build: claudeModel('sonnet'), plan: claudeModel('opus') }
    : { build: claudeModel(model), plan: claudeModel(model) };
}

export const OPENCODE_THINKING_KEYS = ['reasoningEffort', 'thinking', 'effort', 'reasoningConfig'] as const;

export function openCodeThinkingOptions(model: string, thinking?: Thinking): Record<string, unknown> {
  assertThinking('opencode', model, thinking);
  if (!thinking || thinking === 'default') return {};
  if (model.startsWith('amazon-bedrock/')) {
    return { reasoningConfig: { type: 'adaptive', maxReasoningEffort: thinking, display: 'summarized' } };
  }
  if (model.includes('claude-')) return { effort: thinking };
  if (thinking === 'on' || thinking === 'off') {
    if (model.includes('gpt-6-')) return { reasoningEffort: 'none' };
    return { thinking: { type: thinking === 'off' ? 'disabled' : model.includes('minimax') ? 'adaptive' : 'enabled' } };
  }
  return { reasoningEffort: thinking };
}
