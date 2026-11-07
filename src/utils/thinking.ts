import { InvalidConfigError } from './errors.js';

export const THINKING_LEVELS = ['default', 'off', 'on', 'low', 'medium', 'high', 'xhigh', 'max'] as const;
export type Thinking = typeof THINKING_LEVELS[number];
export type ThinkingHarness = 'claude' | 'codex' | 'opencode';

// Unknown/custom models remain usable without guessing their capabilities.
export function thinkingChoices(harness: ThinkingHarness, model: string, session = false): Thinking[] {
  const id = model.split('/').at(-1)!.toLowerCase();
  if (/gpt-6(\.1)?-(astra|sol|luna|terra)$/.test(id)) {
    // Astra and GPT 6.1 Sol reason on every request, so they cannot be switched off.
    return ['default', ...(/astra$|6\.1-sol$/.test(id) ? [] : ['off'] as const), 'low', 'medium', 'high', 'xhigh', 'max'];
  }
  if (/^(opus|sonnet|haiku|fable|best)$/.test(id) || /claude-(opus-5[-.]5|fable-5[-.]1|sonnet-5[-.]5|haiku-5[-.]5)$/.test(id)) {
    return ['default', 'low', 'medium', 'high', 'xhigh', ...(harness === 'claude' && session ? [] : ['max'] as const)];
  }
  if (harness === 'opencode') {
    if (/^(glm-5\.3(-flash)?|kimi-k3(\.1-pro)?|deepseek-v4(\.1-flash(-1017)?|-pro))$/.test(id)) return ['default', 'low', 'high', 'max'];
    if (/^(mimo-v2\.6-(pro|flash)(-free)?|minimax-m3(-free)?)$/.test(id)) return ['default', 'off', 'on'];
    if (id === 'minimax-m3.1-flash') return ['default', 'low', 'medium', 'high', 'xhigh', 'max'];
    if (/^(gemini-4-argon(-contributor)?|gemini-3\.[5-8]-flash(-lite)?)$/.test(id)) return ['default', 'low', 'medium', 'high'];
    if (id === 'grok-4.7') return ['default', 'low', 'medium', 'high', 'xhigh'];
    if (/^mistral-large-4(-0)?$/.test(id)) return ['default', 'off', 'high'];
    if (/^inkling(-2)?(-small)?(-free)?$/.test(id)) return ['default', 'off', 'low', 'medium', 'high', 'max'];
    if (/^muse-(spark-1\.3(-contributor)?|wonder(-1\.0)?)$/.test(id)) return ['default', 'low', 'medium', 'high', 'xhigh', 'max'];
    if (id === 'muse-spark-open') return ['default', 'low', 'medium', 'high', 'xhigh'];
    if (/^nemotron-3\.5-super-vl(-free)?$/.test(id)) return ['default', 'off', 'low', 'medium', 'high', 'xhigh'];
    if (id === 'qwen3.8-max') return ['default', 'off', 'low', 'medium', 'xhigh'];
    if (/^qwen3\.8-max-(0902|prime)$/.test(id)) return ['default', 'low', 'medium', 'high', 'xhigh'];
    if (id === 'hy4') return ['default', 'off', 'high'];
    if (id === 'step-5-preview') return ['default', 'low', 'medium', 'high'];
    if (id === 'ling-3.1-flash') return ['default', 'off', 'on'];
    if (/^beam-(free|1\.0-501b-a23b)$/.test(id)) return ['default', 'low', 'medium', 'high', 'xhigh', 'max'];
  }
  return ['default'];
}

type Role = 'session' | 'sentinel' | 'oracle' | 'architect' | 'keymaker';
const ROLES: readonly Role[] = ['session', 'sentinel', 'oracle', 'architect', 'keymaker'];

// Recommended levels per family, in role order: session, sentinel, oracle, architect, keymaker.
// Where a cell has two levels, the first is the preselected default and the second the alternate.
const RECOMMENDED: Array<[RegExp, Thinking[][]]> = [
  [/^kimi-k3(\.1-pro)?$/, [['low'], ['low'], ['high'], ['high'], ['low', 'high']]],
  [/^gemini-(4-argon(-contributor)?|\d(\.\d)?-flash(-lite)?)$/, [['medium'], ['low'], ['high'], ['high'], ['high', 'medium']]],
  [/^deepseek-v4(\.1-flash(-1017)?|-pro)$/, [['high'], ['low'], ['high'], ['high'], ['high']]],
  [/^gpt-6(\.1)?-sol$/, [['medium'], ['low'], ['xhigh', 'high'], ['high'], ['medium']]],
  [/^gpt-6(\.1)?-(terra|luna)$/, [['medium'], ['low'], ['high'], ['high'], ['medium']]],
  [/^gpt-6(\.1)?-astra$/, [['high'], ['low'], ['xhigh'], ['high'], ['medium']]],
  [/^(opus|fable|best)$|(^|\.)claude-(opus|fable)-/, [['high'], ['low'], ['xhigh'], ['high'], ['medium']]],
  [/^(sonnet|haiku)$|(^|\.)claude-(sonnet|haiku)-/, [['medium'], ['low', 'default'], ['high'], ['high'], ['default']]],
  [/^glm-5\.3(-flash)?$/, [['high'], ['low'], ['high'], ['high'], ['high']]],
  [/^muse-(wonder(-1\.0)?|spark-1\.3(-contributor)?)$/, [['medium'], ['low'], ['xhigh', 'high'], ['high'], ['high', 'medium']]],
  [/^grok-4\.7$/, [['medium'], ['low'], ['high'], ['high'], ['medium']]],
  [/^inkling(-2)?-small(-free)?$/, [['medium'], ['low'], ['high'], ['high'], ['high']]],
  [/^mimo-v2\.6-(pro|flash)(-free)?$/, [['on'], ['off'], ['on'], ['on'], ['on']]],
  [/^minimax-m3\.1-flash$/, [['medium'], ['low'], ['high'], ['high'], ['high']]],
  [/^mistral-large-4(-0)?$/, [['high'], ['off'], ['high'], ['high'], ['high']]],
  [/^nemotron-3\.5-super-vl(-free)?$/, [['medium'], ['low'], ['high'], ['high'], ['high']]],
  [/^qwen3\.8-max(-0902|-prime)?$/, [['medium'], ['low'], ['xhigh'], ['high', 'xhigh'], ['medium']]],
  [/^hy4$/, [['high'], ['off'], ['high'], ['high'], ['high']]],
  [/^step-5-preview$/, [['medium'], ['low'], ['high'], ['high'], ['high', 'medium']]],
  [/^ling-3\.1-flash$/, [['on'], ['off'], ['on'], ['on'], ['on']]],
  [/^beam-(free|1\.0-501b-a23b)$/, [['low'], ['low'], ['high'], ['high'], ['low', 'high']]],
];

const modelId = (model: string): string => model.split('/').at(-1)!.toLowerCase();

// Levels recommended for a model in a slot; the first is the default. Empty when the model has no recommendation.
export function recommendedThinking(model: string, slot: string): Thinking[] {
  const index = ROLES.indexOf(slot as Role);
  const id = modelId(model);
  return index < 0 ? [] : RECOMMENDED.find(([pattern]) => pattern.test(id))?.[1][index] ?? [];
}

// Thinking preselected when a user switches a slot to a new model.
export function defaultThinking(model: string, slot: string): Thinking {
  return recommendedThinking(model, slot)[0] ?? 'default';
}

// Kimi's and Beam's provider default is max, so a saved `default` there is replaced rather than kept.
export function avoidsProviderDefault(model: string): boolean {
  return /^(kimi-k3(\.1-pro)?|beam-(free|1\.0-501b-a23b))$/.test(modelId(model));
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

export const OPENCODE_THINKING_KEYS = ['reasoningEffort', 'thinking', 'effort', 'reasoningConfig', 'reasoning', 'thinkingConfig'] as const;

export function openCodeThinkingOptions(model: string, thinking?: Thinking): Record<string, unknown> {
  assertThinking('opencode', model, thinking);
  if (!thinking || thinking === 'default') return {};
  if (model.startsWith('amazon-bedrock/')) {
    return { reasoningConfig: { type: 'adaptive', maxReasoningEffort: thinking, display: 'summarized' } };
  }
  if (model.startsWith('openrouter/')) {
    if (thinking === 'on' || thinking === 'off') return { reasoning: { enabled: thinking === 'on' } };
    return { reasoning: { effort: thinking } };
  }
  if (model.startsWith('google/')) return { thinkingConfig: { thinkingLevel: thinking } };
  if (model.includes('claude-')) return { effort: thinking };
  if (thinking === 'on' || thinking === 'off') {
    if (/gpt-6|mistral-large|inkling|nemotron|hy4/.test(model)) return { reasoningEffort: 'none' };
    return { thinking: { type: thinking === 'off' ? 'disabled' : model.includes('minimax') ? 'adaptive' : 'enabled' } };
  }
  return { reasoningEffort: thinking };
}
