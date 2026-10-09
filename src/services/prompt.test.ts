import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { promptForSection, formatFileList, promptForSimpleModels, promptForOpenCodeModels, guardProvider } from './prompt.js';
import type { HarnessAdapter, SimpleConfig, OpenCodeConfig } from '../types.js';
import { codexAdapter } from '../adapters/codex.js';
import { opencodeAdapter } from '../adapters/opencode.js';

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
  defaultSection: () => ({ provider: 'opencode-zen', build_model: 'a', plan_model: 'b', agents: [] } as unknown as OpenCodeConfig),
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

  it('prompts for provider, build, plan, and agent models for opencode config', async () => {
    mockAnswers.push(
      { provider: 'opencode-go' },
      { build_model: 'b', plan_model: 'c' },
      { sentinel: 'a', oracle: 'b', architect: 'c', keymaker: 'a' }
    );

    const section = await promptForSection(openCodeAdapter, {
      provider: 'opencode-zen',
      build_model: 'a',
      plan_model: 'b',
      agents: [
        { template: 'sentinel', name: 'sentinel', model: 'a' },
        { template: 'oracle', name: 'oracle', model: 'b' },
        { template: 'architect', name: 'architect', model: 'c' },
        { template: 'keymaker', name: 'keymaker', model: 'a' },
      ],
    } as OpenCodeConfig);

    expect(section.provider).toBe('opencode-go');
    expect(section.build_model).toBe('b');
    expect(section.plan_model).toBe('c');
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
    const questions: any[] = [];
    const prompt = { prompt: async (batch: any[]) => {
      questions.push(...batch);
      return Object.fromEntries(batch.map(q => [q.name, q.default]));
    } } as unknown as typeof import('inquirer').default;
    const original: SimpleConfig = {
      default_model: 'custom-model',
      agents: ['sentinel', 'oracle', 'architect', 'keymaker'].map(name => ({ name, template: name, model: 'custom-agent' })) as SimpleConfig['agents'],
    };
    const result = await codexAdapter.promptSection(prompt, original) as SimpleConfig;
    expect(result.default_model).toBe('custom-model');
    expect(result.agents.map(a => a.model)).toEqual(['custom-agent', 'custom-agent', 'custom-agent', 'custom-agent']);
    expect(result.build_thinking).toBeUndefined();
    expect(result.plan_thinking).toBeUndefined();
    expect(result.agents.every(a => a.thinking === undefined)).toBe(true);
    expect(questions.find(q => q.name === 'default_model').choices).toContain('custom-model');
    expect(original.agents.every(a => a.thinking === undefined)).toBe(true);
  });

  it('offers thinking for the newly selected model and drops incompatible saved thinking', async () => {
    const batches: any[][] = [];
    const prompt = { prompt: async (batch: any[]) => {
      batches.push(batch);
      const answers = Object.fromEntries(batch.map(q => [q.name, q.default]));
      if (batches.length === 1) answers.oracle = 'opencode-go/glm-5.3';
      return answers;
    } } as unknown as typeof import('inquirer').default;
    const original = opencodeAdapter.defaultSection('opencode-go') as OpenCodeConfig;
    const result = await promptForOpenCodeModels(prompt, original, opencodeAdapter.modelsForProvider('opencode-go'), 'opencode-go');
    expect(result.agents[1].model).toBe('opencode-go/glm-5.3');
    expect(result.agents[1].thinking).toBe('default');
    expect(original.agents[1].thinking).toBe('on');
    expect(batches[1].find(q => q.name === 'oracle_thinking').choices).toEqual(['default', 'low', 'high', 'max']);
  });

  it('uses the new provider defaults rather than carrying models across providers', async () => {
    let call = 0;
    const prompt = { prompt: async (batch: any[]) => {
      call++;
      return call === 1 ? { provider: 'opencode-go' } : Object.fromEntries(batch.map(q => [q.name, q.default]));
    } } as unknown as typeof import('inquirer').default;
    const result = await opencodeAdapter.promptSection(prompt, opencodeAdapter.defaultSection('openai')) as OpenCodeConfig;
    expect(result).toEqual(opencodeAdapter.defaultSection('opencode-go'));
    expect(result.agents.every(a => a.model.startsWith('opencode-go/'))).toBe(true);
  });
});
