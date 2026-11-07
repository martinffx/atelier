import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { promptForSection, formatFileList, promptForSimpleModels, promptForOpenCodeModels, guardProvider } from './prompt.js';
import type { HarnessAdapter, SimpleConfig, OpenCodeConfig } from '../types.js';
import { codexAdapter } from '../adapters/codex.js';
import { opencodeAdapter } from '../adapters/opencode.js';
import { claudeAdapter } from '../adapters/claude.js';

const values = (choices: Array<string | { value: string }>): string[] => choices.map(c => typeof c === 'string' ? c : c.value);

type Prompter = typeof import('inquirer').default;

// Answers every question with its default, except names in `overrides`; an undefined override omits that answer.
function scriptedPrompt(overrides: Record<string, unknown> = {}) {
  const batches: any[][] = [];
  const prompt = { prompt: async (batch: any[]) => {
    batches.push(batch);
    const answers: Record<string, unknown> = Object.fromEntries(batch.map(q => [q.name, q.default]));
    for (const [name, value] of Object.entries(overrides)) {
      if (!(name in answers)) continue;
      if (value === undefined) delete answers[name];
      else answers[name] = value;
    }
    return answers;
  } } as unknown as Prompter;
  return { prompt, batches };
}

const mockAnswers: Record<string, unknown>[] = [];
let answerIndex = 0;

await import('inquirer').then(mod => {
  const originalPrompt = mod.default.prompt;
  mod.default.prompt = async (questions: unknown[]) => {
    const answers = mockAnswers[answerIndex++] ?? {};
    const result: Record<string, unknown> = {};
    for (const q of questions as Array<{ name: string }>) {
      if (q.name in answers) {
        result[q.name] = answers[q.name];
      }
    }
    return result;
  };
});

const simpleAdapter: HarnessAdapter = {
  name: 'claude',
  configSchema: {} as unknown as HarnessAdapter['configSchema'],
  defaultSection: () => ({ default_model: 'haiku', agents: [] } as unknown as SimpleConfig),
  modelsForProvider: () => ['haiku', 'sonnet', 'opus'],
  promptSection: async (inquirer, section) => promptForSimpleModels(inquirer, section as SimpleConfig, ['haiku', 'sonnet', 'opus']),
  installAgents: () => {},
  mergeHarnessConfig: () => {},
  fileList: () => [],
  remove: () => {},
};

const openCodeAdapter: HarnessAdapter = {
  name: 'opencode',
  providerChoices: [
    { name: 'Zen', value: 'opencode-zen' },
    { name: 'Go', value: 'opencode-go' },
  ],
  configSchema: {} as unknown as HarnessAdapter['configSchema'],
  defaultSection: () => ({ provider: 'opencode-zen', default_model: 'a', agents: [] } as unknown as OpenCodeConfig),
  modelsForProvider: () => ['a', 'b', 'c'],
  promptSection: async (inquirer, section) => {
    const current = (section as OpenCodeConfig).provider;
    const provider = guardProvider(await (async () => {
      const answer = await inquirer.prompt([{ type: 'list', name: 'provider', message: 'Which provider are you using?', choices: openCodeAdapter.providerChoices, default: current }]);
      return answer.provider as OpenCodeConfig['provider'];
    })());
    return promptForOpenCodeModels(inquirer, section as OpenCodeConfig, openCodeAdapter.modelsForProvider(provider), provider);
  },
  installAgents: () => {},
  mergeHarnessConfig: () => {},
  fileList: () => [],
  remove: () => {},
};

describe('prompt', () => {
  beforeEach(() => {
    answerIndex = 0;
    mockAnswers.length = 0;
  });

  it('prompts for default model and agent models for simple config', async () => {
    mockAnswers.push(
      { default_model: 'sonnet' },
      { sentinel: 'haiku', oracle: 'opus', architect: 'opus', keymaker: 'haiku' }
    );

    const section = await promptForSection(simpleAdapter, {
      default_model: 'haiku',
      agents: [
        { template: 'sentinel', name: 'sentinel', model: 'haiku' },
        { template: 'oracle', name: 'oracle', model: 'opus' },
        { template: 'architect', name: 'architect', model: 'opus' },
        { template: 'keymaker', name: 'keymaker', model: 'haiku' },
      ],
    });

    expect(section.default_model).toBe('sonnet');
    expect(section.agents).toEqual([
      { template: 'sentinel', name: 'sentinel', model: 'haiku' },
      { template: 'oracle', name: 'oracle', model: 'opus' },
      { template: 'architect', name: 'architect', model: 'opus' },
      { template: 'keymaker', name: 'keymaker', model: 'haiku' },
    ]);
  });

  it('prompts for provider, session model, and agent models for opencode config', async () => {
    mockAnswers.push(
      { provider: 'opencode-go' },
      { default_model: 'b' },
      { sentinel: 'a', oracle: 'b', architect: 'c', keymaker: 'a' }
    );

    const section = await promptForSection(openCodeAdapter, {
      provider: 'opencode-zen',
      default_model: 'a',
      agents: [
        { template: 'sentinel', name: 'sentinel', model: 'a' },
        { template: 'oracle', name: 'oracle', model: 'b' },
        { template: 'architect', name: 'architect', model: 'c' },
        { template: 'keymaker', name: 'keymaker', model: 'a' },
      ],
    } as OpenCodeConfig);

    expect(section.provider).toBe('opencode-go');
    expect(section.default_model).toBe('b');
    expect(section.agents).toEqual([
      { template: 'sentinel', name: 'sentinel', model: 'a' },
      { template: 'oracle', name: 'oracle', model: 'b' },
      { template: 'architect', name: 'architect', model: 'c' },
      { template: 'keymaker', name: 'keymaker', model: 'a' },
    ]);
  });

  it('throws when provider is undefined for opencode', () => {
    expect(() => guardProvider(undefined)).toThrow();
    expect(() => guardProvider('claude' as unknown as import('../types.js').Provider)).toThrow();
  });

  it('accepts OpenAI as an opencode provider', () => {
    expect(guardProvider('openai')).toBe('openai');
  });

  it('formatFileList renders exists marker', () => {
    const files = [
      { path: '~/.claude/settings.json', exists: true },
      { path: '~/.claude/agents/sentinel.md', exists: false },
    ];
    expect(formatFileList(files)).toBe('  ~ ~/.claude/settings.json\n  + ~/.claude/agents/sentinel.md');
  });

  it('keeps saved custom models and implicit thinking when accepting defaults', async () => {
    const { prompt, batches } = scriptedPrompt();
    const original: SimpleConfig = {
      default_model: 'custom-model',
      agents: ['sentinel', 'oracle', 'architect', 'keymaker'].map(name => ({ name, template: name, model: 'custom-agent' })) as SimpleConfig['agents'],
    };
    const result = await codexAdapter.promptSection(prompt, original) as SimpleConfig;
    const questions = batches.flat();
    expect(result.default_model).toBe('custom-model');
    expect(result.agents.map(a => a.model)).toEqual(['custom-agent', 'custom-agent', 'custom-agent', 'custom-agent']);
    expect(result.build_thinking).toBeUndefined();
    expect(result.agents.every(a => a.thinking === undefined)).toBe(true);
    expect(questions.find(q => q.name === 'default_model').choices).toContain('custom-model');
    expect(original.agents.every(a => a.thinking === undefined)).toBe(true);
  });

  it('keeps a saved model that the catalog no longer lists selectable', async () => {
    const { prompt, batches } = scriptedPrompt();
    expect(codexAdapter.modelsForProvider()).not.toContain('gpt-5.6-sol');
    const original: SimpleConfig = {
      default_model: 'gpt-5.6-sol',
      agents: ['sentinel', 'oracle', 'architect', 'keymaker'].map(name => ({ name, template: name, model: name === 'oracle' ? 'gpt-5.6-sol' : 'gpt-6-luna' })) as SimpleConfig['agents'],
    };
    const result = await codexAdapter.promptSection(prompt, original) as SimpleConfig;
    const questions = batches.flat();
    expect(questions.find(q => q.name === 'default_model').choices).toContain('gpt-5.6-sol');
    expect(questions.find(q => q.name === 'oracle').choices).toContain('gpt-5.6-sol');
    expect(result.default_model).toBe('gpt-5.6-sol');
    expect(result.agents.find(a => a.name === 'oracle')!.model).toBe('gpt-5.6-sol');
  });

  it('asks for build and plan thinking on Codex and OpenCode, and one session thinking on Claude', async () => {
    const run = async (adapter: HarnessAdapter, section: SimpleConfig | OpenCodeConfig, provider?: string) => {
      const { prompt, batches } = scriptedPrompt(provider ? { provider } : {});
      await adapter.promptSection(prompt, section);
      return batches.flat().filter(q => q.name.endsWith('_thinking'));
    };
    const codex = await run(codexAdapter, codexAdapter.defaultSection());
    expect(codex.map(q => q.name).slice(0, 2)).toEqual(['build_thinking', 'plan_thinking']);
    expect(codex[0].message).toBe('Select thinking for build (gpt-6-astra)');
    expect(codex[1].message).toBe('Select thinking for plan (gpt-6-astra)');
    expect(codex[1].default).toBe('high');
    expect(codex[1].choices.find((c: any) => c.value === 'high').name).toBe('high (recommended)');

    const opencode = await run(opencodeAdapter, opencodeAdapter.defaultSection('opencode-zen'), 'opencode-zen');
    expect(opencode.map(q => q.name).slice(0, 2)).toEqual(['build_thinking', 'plan_thinking']);
    expect(Object.fromEntries(opencode.map(q => [q.name, q.default]))).toMatchObject({ build_thinking: 'low', plan_thinking: 'high' });

    const claude = await run(claudeAdapter, claudeAdapter.defaultSection());
    expect(claude.map(q => q.name)).not.toContain('plan_thinking');
    expect(claude.find(q => q.name === 'build_thinking').message).toBe('Select thinking for session (opus)');
  });

  it('re-preselects plan thinking when the session model changes, and keeps it otherwise', async () => {
    const run = async (model: string) => {
      const { prompt, batches } = scriptedPrompt({ default_model: model });
      const base = opencodeAdapter.defaultSection('opencode-go') as OpenCodeConfig;
      const original = { ...base, default_model: 'opencode-go/glm-5.3', build_thinking: 'low', plan_thinking: 'low' } as OpenCodeConfig;
      const result = await promptForOpenCodeModels(prompt, original, ['opencode-go/glm-5.3', 'opencode-go/kimi-k3.1-pro'], 'opencode-go');
      return { result, original, plan: batches[1].find(q => q.name === 'plan_thinking') };
    };
    const changed = await run('opencode-go/kimi-k3.1-pro');
    expect(changed.plan.default).toBe('high');
    expect(changed.result.plan_thinking).toBe('high');
    expect(changed.original.plan_thinking).toBe('low');
    const unchanged = await run('opencode-go/glm-5.3');
    expect(unchanged.plan.default).toBe('low');
    expect(unchanged.result.plan_thinking).toBe('low');
  });

  it('offers thinking for the newly selected model and drops incompatible saved thinking', async () => {
    const { prompt, batches } = scriptedPrompt({ oracle: 'opencode-go/glm-5.3' });
    const original = opencodeAdapter.defaultSection('opencode-go') as OpenCodeConfig;
    const result = await promptForOpenCodeModels(prompt, original, opencodeAdapter.modelsForProvider('opencode-go'), 'opencode-go');
    expect(result.agents[1].model).toBe('opencode-go/glm-5.3');
    expect(result.agents[1].thinking).toBe('high');
    expect(original.agents[1].thinking).toBe('on');
    expect(values(batches[1].find(q => q.name === 'oracle_thinking').choices)).toEqual(['default', 'low', 'high', 'max']);
  });

  describe('openrouter warming question', () => {
    const run = async (provider: 'openrouter' | 'openai', saved?: boolean, answer?: boolean) => {
      const { prompt, batches } = scriptedPrompt(answer === undefined ? {} : { warming: answer });
      const original = { ...opencodeAdapter.defaultSection(provider), ...(saved === undefined ? {} : { warming: saved }) } as OpenCodeConfig;
      const result = await promptForOpenCodeModels(prompt, original, opencodeAdapter.modelsForProvider(provider), provider);
      return { result, question: batches.flat().find(q => q.name === 'warming') };
    };

    it('is asked for OpenRouter only', async () => {
      const or = await run('openrouter');
      expect(or.question.type).toBe('confirm');
      expect(or.question.message).toContain('keep-alive');
      expect(or.question.message).toContain('money');
      expect((await run('openai')).question).toBeUndefined();
    });

    it('defaults to no', async () => {
      const { question, result } = await run('openrouter');
      expect(question.default).toBe(false);
      expect(result.warming).toBe(false);
    });

    it('keeps a saved answer', async () => {
      const { question, result } = await run('openrouter', true);
      expect(question.default).toBe(true);
      expect(result.warming).toBe(true);
    });

    it('keeps the saved value when the answer is missing', async () => {
      const { prompt } = scriptedPrompt({ warming: undefined });
      const original = { ...opencodeAdapter.defaultSection('openrouter'), warming: true } as OpenCodeConfig;
      const result = await promptForOpenCodeModels(prompt, original, opencodeAdapter.modelsForProvider('openrouter'), 'openrouter');
      expect(result.warming).toBe(true);
    });
  });

  it('carries session thinking when the session model is unchanged', async () => {
    const { prompt, batches } = scriptedPrompt();
    const original = { ...opencodeAdapter.defaultSection('opencode-go'), default_model: 'opencode-go/glm-5.3', build_thinking: 'high' } as OpenCodeConfig;
    const result = await promptForOpenCodeModels(prompt, original, ['opencode-go/glm-5.3'], 'opencode-go');
    expect(result.build_thinking).toBe('high');
    const session = batches[1].find(q => q.name === 'build_thinking');
    expect(session.message).toBe('Select thinking for build (opencode-go/glm-5.3)');
    expect(values(session.choices)).toEqual(['default', 'low', 'high', 'max']);
    expect(original.build_thinking).toBe('high');
  });

  it('resets session thinking to the family default when the session model changes', async () => {
    const { prompt, batches } = scriptedPrompt({ default_model: 'opencode-go/deepseek-v4-pro' });
    const original = { ...opencodeAdapter.defaultSection('opencode-go'), default_model: 'opencode-go/glm-5.3', build_thinking: 'high' } as OpenCodeConfig;
    const result = await promptForOpenCodeModels(prompt, original, ['opencode-go/glm-5.3', 'opencode-go/deepseek-v4-pro'], 'opencode-go');
    expect(result.default_model).toBe('opencode-go/deepseek-v4-pro');
    expect(result.build_thinking).toBe('high');
    expect(batches[1].find(q => q.name === 'build_thinking').message).toBe('Select thinking for build (opencode-go/deepseek-v4-pro)');
    expect(original.build_thinking).toBe('high');
  });

  for (const kimi of ['opencode-go/kimi-k3.1-pro', 'openrouter/moonshotai/kimi-k3.1-pro']) {
    it(`preselects slot-specific thinking when changing to ${kimi}`, async () => {
      const { prompt, batches } = scriptedPrompt(Object.fromEntries(['default_model', 'sentinel', 'oracle', 'architect', 'keymaker'].map(name => [name, kimi])));
      const base = opencodeAdapter.defaultSection('opencode-go') as OpenCodeConfig;
      const original = { ...base, default_model: 'opencode-go/glm-5.3', build_thinking: 'max', agents: base.agents.map(a => ({ ...a, model: 'opencode-go/glm-5.3', thinking: 'max' as const })) } as OpenCodeConfig;
      const result = await promptForOpenCodeModels(prompt, original, ['opencode-go/glm-5.3', kimi], 'opencode-go');
      const defaults = Object.fromEntries(batches[1].map(q => [q.name, q.default]));
      expect(defaults).toEqual({ build_thinking: 'low', plan_thinking: 'high', sentinel_thinking: 'low', oracle_thinking: 'high', architect_thinking: 'high', keymaker_thinking: 'low' });
      expect(result.build_thinking).toBe('low');
      expect(result.agents.map(a => a.thinking)).toEqual(['low', 'high', 'high', 'low']);
    });
  }

  it('keeps default thinking for changed models outside the table', async () => {
    const { prompt, batches } = scriptedPrompt({ default_model: 'opencode-go/minimax-m3' });
    const original = { ...opencodeAdapter.defaultSection('opencode-go'), default_model: 'opencode-go/glm-5.3' } as OpenCodeConfig;
    await promptForOpenCodeModels(prompt, original, ['opencode-go/glm-5.3', 'opencode-go/minimax-m3'], 'opencode-go');
    const session = batches[1].find(q => q.name === 'build_thinking');
    expect(session.default).toBe('default');
    expect(session.choices.every((c: any) => typeof c === 'string' || !c.name.includes('recommended'))).toBe(true);
  });

  it('preselects slot values rather than default when changing to Kimi K3', async () => {
    const { prompt, batches } = scriptedPrompt(Object.fromEntries(['default_model', 'sentinel', 'oracle', 'architect', 'keymaker'].map(name => [name, 'opencode/kimi-k3'])));
    const original = { ...opencodeAdapter.defaultSection('opencode-go'), default_model: 'opencode-go/glm-5.3' } as OpenCodeConfig;
    await promptForOpenCodeModels(prompt, original, ['opencode-go/glm-5.3', 'opencode/kimi-k3'], 'opencode-go');
    expect(Object.fromEntries(batches[1].map(q => [q.name, q.default]))).toEqual({ build_thinking: 'low', plan_thinking: 'high', sentinel_thinking: 'low', oracle_thinking: 'high', architect_thinking: 'high', keymaker_thinking: 'low' });
  });

  it('marks both split-cell levels as recommended for a Kimi Keymaker', async () => {
    const { prompt, batches } = scriptedPrompt();
    const kimi = 'opencode-go/kimi-k3.1-pro';
    const base = opencodeAdapter.defaultSection('opencode-go') as OpenCodeConfig;
    const original = { ...base, agents: base.agents.map(a => a.name === 'keymaker' ? { ...a, model: kimi, thinking: 'low' as const } : a) } as OpenCodeConfig;
    await promptForOpenCodeModels(prompt, original, [...opencodeAdapter.modelsForProvider('opencode-go'), kimi], 'opencode-go');
    const q = batches[1].find(x => x.name === 'keymaker_thinking');
    expect(q.default).toBe('low');
    expect(q.choices).toEqual([
      { name: 'default', value: 'default' },
      { name: 'low (recommended)', value: 'low' },
      { name: 'high (recommended)', value: 'high' },
      { name: 'max', value: 'max' },
    ]);
  });

  it('keeps a saved default on an unchanged non-Kimi model', async () => {
    const { prompt } = scriptedPrompt();
    const base = opencodeAdapter.defaultSection('opencode-go') as OpenCodeConfig;
    const original = { ...base, default_model: 'opencode-go/glm-5.3', build_thinking: 'default', agents: base.agents.map(a => a.name === 'architect' ? { ...a, thinking: 'default' as const } : a) } as OpenCodeConfig;
    const result = await promptForOpenCodeModels(prompt, original, opencodeAdapter.modelsForProvider('opencode-go'), 'opencode-go');
    expect(result.build_thinking).toBe('default');
    expect(result.agents.find(a => a.name === 'architect')!.thinking).toBe('default');
  });

  it('excludes max from Claude session recommendations and choices', async () => {
    const { prompt, batches } = scriptedPrompt();
    const original = claudeAdapter.defaultSection() as SimpleConfig;
    await promptForSimpleModels(prompt, original, claudeAdapter.modelsForProvider(), 'claude');
    const session = batches[1].find(q => q.name === 'build_thinking');
    expect(values(session.choices)).not.toContain('max');
    expect(session.default).toBe('high');
  });

  for (const [saved, expected] of [['default', 'low'], ['max', 'max'], ['low', 'low']] as const) {
    it(`unchanged Kimi K3.1 Pro session with saved ${saved} gives ${expected}`, async () => {
      const { prompt } = scriptedPrompt();
      const original = { ...opencodeAdapter.defaultSection('opencode-go'), default_model: 'opencode-go/kimi-k3.1-pro', build_thinking: saved } as OpenCodeConfig;
      const result = await promptForOpenCodeModels(prompt, original, ['opencode-go/kimi-k3.1-pro'], 'opencode-go');
      expect(result.build_thinking).toBe(expected);
    });
  }

  it('preselects the slot default for a saved default on an unchanged Kimi Oracle', async () => {
    const { prompt } = scriptedPrompt();
    const base = opencodeAdapter.defaultSection('opencode-go') as OpenCodeConfig;
    const kimi = 'opencode-go/kimi-k3.1-pro';
    const original = { ...base, agents: base.agents.map(a => a.name === 'oracle' ? { ...a, model: kimi, thinking: 'default' as const } : a) } as OpenCodeConfig;
    const result = await promptForOpenCodeModels(prompt, original, [...opencodeAdapter.modelsForProvider('opencode-go'), kimi], 'opencode-go');
    expect(result.agents.find(a => a.name === 'oracle')!.thinking).toBe('high');
  });

  it('uses the new provider defaults rather than carrying models across providers', async () => {
    const { prompt } = scriptedPrompt({ provider: 'opencode-go' });
    const result = await opencodeAdapter.promptSection(prompt, opencodeAdapter.defaultSection('openai')) as OpenCodeConfig;
    expect(result).toEqual(opencodeAdapter.defaultSection('opencode-go'));
    expect(result.agents.every(a => a.model.startsWith('opencode-go/'))).toBe(true);
  });
});
