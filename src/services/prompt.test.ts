import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { promptForSection, formatFileList, promptForSimpleModels, promptForOpenCodeModels, guardProvider } from './prompt.js';
import type { HarnessAdapter, SimpleConfig, OpenCodeConfig } from '../types.js';

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
      { recon: 'haiku', oracle: 'opus', architect: 'opus' }
    );

    const section = await promptForSection(simpleAdapter, {
      default_model: 'haiku',
      agents: [
        { template: 'recon', name: 'recon', model: 'haiku' },
        { template: 'oracle', name: 'oracle', model: 'opus' },
        { template: 'architect', name: 'architect', model: 'opus' },
      ],
    });

    expect(section.default_model).toBe('sonnet');
    expect(section.agents).toEqual([
      { template: 'recon', name: 'recon', model: 'haiku' },
      { template: 'oracle', name: 'oracle', model: 'opus' },
      { template: 'architect', name: 'architect', model: 'opus' },
    ]);
  });

  it('prompts for provider, build, plan, and agent models for opencode config', async () => {
    mockAnswers.push(
      { provider: 'opencode-go' },
      { build_model: 'b', plan_model: 'c' },
      { recon: 'a', oracle: 'b', architect: 'c' }
    );

    const section = await promptForSection(openCodeAdapter, {
      provider: 'opencode-zen',
      build_model: 'a',
      plan_model: 'b',
      agents: [
        { template: 'recon', name: 'recon', model: 'a' },
        { template: 'oracle', name: 'oracle', model: 'b' },
        { template: 'architect', name: 'architect', model: 'c' },
      ],
    } as OpenCodeConfig);

    expect(section.provider).toBe('opencode-go');
    expect(section.build_model).toBe('b');
    expect(section.plan_model).toBe('c');
    expect(section.agents).toEqual([
      { template: 'recon', name: 'recon', model: 'a' },
      { template: 'oracle', name: 'oracle', model: 'b' },
      { template: 'architect', name: 'architect', model: 'c' },
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
      { path: '~/.claude/agents/recon.md', exists: false },
    ];
    expect(formatFileList(files)).toBe('  ~ ~/.claude/settings.json\n  + ~/.claude/agents/recon.md');
  });
});
