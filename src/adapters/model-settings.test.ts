import { describe, expect, it } from 'bun:test';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import matter from 'gray-matter';
import * as TOML from 'smol-toml';
import { claudeAdapter } from './claude.js';
import { codexAdapter } from './codex.js';
import { opencodeAdapter } from './opencode.js';
import { ClaudeConfigSchema, CodexConfigSchema, OpenCodeConfigSchema } from '../utils/schemas.js';
import { thinkingChoices, openCodeThinkingOptions, recommendedThinking, defaultThinking, avoidsProviderDefault } from '../utils/thinking.js';
import type { ThinkingHarness } from '../utils/thinking.js';
import type { HarnessAdapter, SimpleConfig, CodexConfig, OpenCodeConfig, Provider } from '../types.js';

// Each row: the four agent models then the single session model; the four agent levels then the build thinking;
// then the plan thinking (Claude has no plan setting).
const cases: Array<[HarnessAdapter, Provider, string[], string[], string | undefined]> = [
  [claudeAdapter, 'anthropic', ['haiku', 'opus', 'opus', 'sonnet', 'claude-opus-5-5'], ['low', 'xhigh', 'high', 'default', 'high'], undefined],
  [codexAdapter, 'openai', ['gpt-6-luna', 'gpt-6-astra', 'gpt-6-astra', 'gpt-6-sol', 'gpt-6-astra'], ['low', 'xhigh', 'high', 'medium', 'high'], 'high'],
  [opencodeAdapter, 'openai', ['openai/gpt-6-luna', 'openai/gpt-6-astra', 'openai/gpt-6-astra', 'openai/gpt-6-sol', 'openai/gpt-6-astra'], ['low', 'xhigh', 'high', 'medium', 'high'], 'high'],
  [opencodeAdapter, 'amazon-bedrock', ['amazon-bedrock/us.anthropic.claude-haiku-5-5', 'amazon-bedrock/us.anthropic.claude-fable-5-1', 'amazon-bedrock/us.anthropic.claude-opus-5-5', 'amazon-bedrock/us.anthropic.claude-sonnet-5-5', 'amazon-bedrock/us.anthropic.claude-opus-5-5'], ['low', 'xhigh', 'high', 'default', 'high'], 'high'],
  [opencodeAdapter, 'opencode-zen', ['opencode/glm-5.3-flash', 'opencode/kimi-k3', 'opencode/glm-5.3', 'opencode/deepseek-v4.1-flash', 'opencode/kimi-k3'], ['low', 'high', 'high', 'high', 'low'], 'high'],
  [opencodeAdapter, 'opencode-go', ['opencode-go/glm-5.3-flash', 'opencode-go/mimo-v2.6-pro', 'opencode-go/glm-5.3', 'opencode-go/deepseek-v4.1-flash', 'opencode-go/kimi-k3.1-pro'], ['low', 'on', 'high', 'high', 'low'], 'high'],
  [opencodeAdapter, 'openrouter', ['openrouter/z-ai/glm-5.3-flash', 'openrouter/moonshotai/kimi-k3.1-pro', 'openrouter/z-ai/glm-5.3', 'openrouter/deepseek/deepseek-v4.1-flash-1017', 'openrouter/moonshotai/kimi-k3.1-pro'], ['low', 'high', 'high', 'high', 'low'], 'high'],
  [opencodeAdapter, 'google', ['google/gemini-3.5-flash-lite', 'google/gemini-4-argon', 'google/gemini-4-argon', 'google/gemini-3.8-flash', 'google/gemini-4-argon'], ['low', 'high', 'high', 'high', 'medium'], 'high'],
];

// Where each OpenCode provider carries the selected effort in its native options.
const effortOf = (provider: Provider, o: any): unknown =>
  provider === 'amazon-bedrock' ? o.reasoningConfig?.maxReasoningEffort
    : provider === 'openrouter' ? o.reasoning?.effort
    : provider === 'google' ? o.thinkingConfig?.thinkingLevel
    : o.reasoningEffort;

describe('model and thinking settings', () => {
  for (const [adapter, provider, models, levels, plan] of cases) {
    it(`${adapter.name}/${provider}: generates four agent assignments, one session model, build and plan thinking, then removes them`, () => {
      const root = mkdtempSync(join(tmpdir(), 'atelier-models-'));
      try {
        const config = adapter.defaultSection(provider) as SimpleConfig | OpenCodeConfig;
        expect(adapter.configSchema.safeParse(config).success).toBe(true);
        expect(config.agents.map(a => a.model)).toEqual(models.slice(0, 4));
        expect([...config.agents.map(a => a.thinking), config.build_thinking]).toEqual(levels);
        if (adapter.name === 'claude') expect('plan_thinking' in config).toBe(false);
        else expect((config as OpenCodeConfig).plan_thinking).toBe(plan);
        for (const agent of config.agents) expect(adapter.modelsForProvider(provider)).toContain(agent.model);
        expect(adapter.modelsForProvider(provider)).toContain(config.default_model);
        adapter.installAgents(config, root);
        adapter.mergeHarnessConfig(config, root);
        const nativePath = join(root, adapter.name === 'opencode' ? 'opencode.json' : adapter.name === 'codex' ? '.codex/config.toml' : '.claude/settings.json');
        const first = readFileSync(nativePath, 'utf8');
        adapter.mergeHarnessConfig(config, root);
        expect(readFileSync(nativePath, 'utf8')).toBe(first);
        const native = adapter.name === 'codex' ? TOML.parse(first) : JSON.parse(first);
        config.agents.forEach((agent, index) => {
          const file = join(root, `.${adapter.name}`, adapter.name === 'opencode' ? 'agent' : 'agents', `${agent.name}.${adapter.name === 'codex' ? 'toml' : 'md'}`);
          const raw = readFileSync(file, 'utf8');
          const data = adapter.name === 'codex' ? TOML.parse(raw) : matter(raw).data;
          expect(data.model).toBe(models[index]);
          if (adapter.name === 'codex') expect(data.model_reasoning_effort).toBe(levels[index]);
          else if (adapter.name === 'claude') expect(data.effort).toBe(levels[index] === 'default' ? undefined : levels[index]);
          else {
            expect(data.temperature).toBeUndefined();
            if (provider === 'opencode-go' && index === 1) expect(data.thinking).toEqual({ type: 'enabled' });
            else expect(effortOf(provider, data)).toBe(levels[index] === 'default' ? undefined : levels[index]);
          }
        });
        if (adapter.name === 'claude') {
          expect(JSON.stringify(native)).not.toContain('plan');
          // Claude keys session effort by model id, and the session model is the bare alias.
          expect(native.model).toBe('opus');
          expect(native.modelSettings[models[4]].effortLevel).toBe(levels[4]);
          expect(native.modelSettings[models[4]].autoCompactWindow).toBeUndefined();
        } else if (adapter.name === 'codex') {
          expect(native.model).toBe(models[4]);
          expect(native.model_reasoning_effort).toBe(levels[4]);
          expect(native.plan_mode_reasoning_effort).toBe(plan);
        } else {
          expect(native.agent.plan.mode).toBe('primary');
          expect(native.agent.plan.model).toBe(models[4]);
          expect(effortOf(provider, native.agent.plan)).toBe(plan);
          expect(native.agent.build.model).toBe(models[4]);
          expect(effortOf(provider, native.agent.build)).toBe(levels[4]);
        }
        adapter.remove(config, root);
        expect(existsSync(nativePath)).toBe(false);
      } finally { rmSync(root, { recursive: true, force: true }); }
    });
  }

  it('rejects unsupported effort without inventing levels for custom models', () => {
    const zen = opencodeAdapter.defaultSection('opencode-zen') as OpenCodeConfig;
    expect(OpenCodeConfigSchema.safeParse({ ...zen, default_model: 'custom/unknown', build_thinking: 'high' }).success).toBe(false);
    expect(OpenCodeConfigSchema.safeParse({ ...zen, default_model: 'custom/unknown', build_thinking: 'default', plan_thinking: 'default' }).success).toBe(true);
    const mimo = opencodeAdapter.defaultSection('opencode-go') as OpenCodeConfig;
    mimo.agents[1].thinking = 'high';
    expect(OpenCodeConfigSchema.safeParse(mimo).success).toBe(false);
    // GLM 5.3 session thinking allows only default, low, high and max.
    expect(OpenCodeConfigSchema.safeParse({ ...zen, default_model: 'opencode/glm-5.3', build_thinking: 'high' }).success).toBe(true);
    expect(OpenCodeConfigSchema.safeParse({ ...zen, default_model: 'opencode/glm-5.3', build_thinking: 'medium' }).success).toBe(false);
    // plan_thinking is checked against default_model on Codex and OpenCode.
    expect(OpenCodeConfigSchema.safeParse({ ...zen, default_model: 'opencode/glm-5.3', plan_thinking: 'high' }).success).toBe(true);
    expect(OpenCodeConfigSchema.safeParse({ ...zen, default_model: 'opencode/glm-5.3', plan_thinking: 'medium' }).success).toBe(false);
    const codex = codexAdapter.defaultSection();
    expect(CodexConfigSchema.safeParse({ ...codex, plan_thinking: 'off' }).success).toBe(false);
    expect(CodexConfigSchema.safeParse({ ...codex, plan_thinking: 'xhigh' }).success).toBe(true);
    const claude = claudeAdapter.defaultSection() as SimpleConfig;
    expect('plan_thinking' in ClaudeConfigSchema.parse({ ...claude, plan_thinking: 'high' })).toBe(false);
    expect(ClaudeConfigSchema.safeParse({ ...claude, build_thinking: 'max' }).success).toBe(false);
    claude.agents[0].thinking = 'low';
    expect(ClaudeConfigSchema.safeParse(claude).success).toBe(true);
    claude.agents[0].model = 'custom-model';
    expect(ClaudeConfigSchema.safeParse(claude).success).toBe(false);
    for (const model of ['haiku', 'claude-haiku-5-5']) {
      expect(thinkingChoices('claude', model)).toEqual(['default', 'low', 'medium', 'high', 'xhigh', 'max']);
      expect(thinkingChoices('claude', model, true)).not.toContain('max');
    }
    expect(thinkingChoices('codex', 'gpt-6-astra')).not.toContain('off');
    expect(thinkingChoices('codex', 'gpt-6-sol')).toContain('off');
    expect(thinkingChoices('opencode', 'custom/unknown')).toEqual(['default']);
    expect(openCodeThinkingOptions('openai/gpt-6-luna', 'off')).toEqual({ reasoningEffort: 'none' });
    expect(openCodeThinkingOptions('opencode-go/mimo-v2.6-pro', 'off')).toEqual({ thinking: { type: 'disabled' } });
    expect(openCodeThinkingOptions('opencode/claude-opus-5-5', 'high')).toEqual({ effort: 'high' });
  });

  it('only recommends levels the harness supports, and matches aliases and Bedrock ids', () => {
    const models: Array<[ThinkingHarness, string]> = [
      ['claude', 'opus'], ['claude', 'fable'], ['claude', 'best'], ['claude', 'sonnet'], ['claude', 'haiku'], ['claude', 'claude-opus-5-5'],
      ['codex', 'gpt-6-sol'], ['codex', 'gpt-6-terra'], ['codex', 'gpt-6-luna'], ['codex', 'gpt-6-astra'],
      ['opencode', 'amazon-bedrock/us.anthropic.claude-opus-5-5'], ['opencode', 'openai/gpt-6.1-sol'],
      ['opencode', 'opencode/kimi-k3'], ['opencode', 'opencode-go/kimi-k3.1-pro'], ['opencode', 'google/gemini-4-argon'], ['opencode', 'google/gemini-3.8-flash'],
      ['opencode', 'opencode/deepseek-v4.1-flash'], ['opencode', 'opencode-go/deepseek-v4-pro'], ['opencode', 'opencode/glm-5.3'], ['opencode', 'opencode/glm-5.3-flash'],
      ['opencode', 'opencode/muse-wonder-1.0'], ['opencode', 'opencode-go/muse-spark-1.3-contributor'], ['opencode', 'opencode/grok-4.7'],
      ['opencode', 'opencode/inkling-2-small-free'], ['opencode', 'opencode-go/mimo-v2.6-pro'], ['opencode', 'opencode-go/mimo-v2.6-flash-free'],
      ['opencode', 'opencode-go/minimax-m3.1-flash'], ['opencode', 'opencode/mistral-large-4-0'], ['opencode', 'opencode/nemotron-3.5-super-vl-free'],
    ];
    for (const [harness, model] of models) {
      for (const slot of ['session', 'plan', 'sentinel', 'oracle', 'architect', 'keymaker']) {
        const recs = recommendedThinking(model, slot);
        expect(recs.length).toBeGreaterThan(0);
        for (const level of recs) expect(thinkingChoices(harness, model, slot === 'session')).toContain(level);
        expect(defaultThinking(model, slot)).toBe(recs[0]);
      }
    }
    // Newer families list levels one catalog may lack (Qwen's high is not on Go), so at least one must be offered.
    const added: Array<[ThinkingHarness, string]> = [
      ['opencode', 'opencode/qwen3.8-max'], ['opencode', 'opencode-go/qwen3.8-max'], ['opencode', 'openrouter/qwen/qwen3.8-max-0902'], ['opencode', 'openrouter/qwen/qwen3.8-max-prime'],
      ['opencode', 'opencode-go/hy4'], ['opencode', 'openrouter/tencent/hy4'],
      ['opencode', 'opencode-go/step-5-preview'], ['opencode', 'openrouter/stepfun/step-5-preview'],
      ['opencode', 'openrouter/inclusionai/ling-3.1-flash'],
      ['opencode', 'opencode/beam-free'], ['opencode', 'opencode-go/beam-free'], ['opencode', 'openrouter/reflection/beam-1.0-501b-a23b'],
    ];
    for (const [harness, model] of added) {
      for (const slot of ['session', 'plan', 'sentinel', 'oracle', 'architect', 'keymaker']) {
        const recs = recommendedThinking(model, slot);
        expect(recs.length).toBeGreaterThan(0);
        expect(recs.some(level => thinkingChoices(harness, model, slot === 'session').includes(level))).toBe(true);
      }
    }
    // Plan is design work, so it follows the architect column.
    for (const [, model] of [...models, ...added]) expect(recommendedThinking(model, 'plan')).toEqual(recommendedThinking(model, 'architect'));
    expect(recommendedThinking('opus', 'oracle')).toEqual(['xhigh']);
    expect(recommendedThinking('amazon-bedrock/us.anthropic.claude-fable-5-1', 'oracle')).toEqual(['xhigh']);
    expect(recommendedThinking('sonnet', 'sentinel')).toEqual(['low', 'default']);
    expect(recommendedThinking('openai/gpt-6-sol', 'oracle')).toEqual(['xhigh', 'high']);
    expect(recommendedThinking('opencode/kimi-k3', 'keymaker')).toEqual(['low', 'high']);
    expect(recommendedThinking('custom/unknown', 'oracle')).toEqual([]);
    expect(recommendedThinking('opencode/muse-wonder', 'keymaker')).toEqual(['high', 'medium']);
    expect(recommendedThinking('opencode/mimo-v2.6-pro', 'sentinel')).toEqual(['off']);
    for (const id of ['opencode/muse-spark-open', 'opencode/inkling', 'opencode/minimax-m3', 'opencode/nemotron-3.5-lightning']) expect(recommendedThinking(id, 'oracle')).toEqual([]);
    expect(defaultThinking('custom/unknown', 'oracle')).toBe('default');
  });

  it('supports the November 2026 catalog additions', () => {
    // OpenRouter spells versions with dots; Astra and GPT 6.1 Sol always reason.
    expect(thinkingChoices('opencode', 'openrouter/anthropic/claude-opus-5.5')).toContain('xhigh');
    expect(thinkingChoices('opencode', 'openrouter/openai/gpt-6.1-sol')).not.toContain('off');
    expect(thinkingChoices('opencode', 'openrouter/openai/gpt-6.1-terra')).toContain('off');
    expect(thinkingChoices('opencode', 'opencode/gpt-6.1-sol')).not.toContain('off');
    expect(thinkingChoices('opencode', 'opencode-go/kimi-k3.1-pro')).toEqual(['default', 'low', 'high', 'max']);
    expect(thinkingChoices('opencode', 'openrouter/deepseek/deepseek-v4.1-flash-1017')).toEqual(['default', 'low', 'high', 'max']);
    expect(thinkingChoices('opencode', 'opencode-go/minimax-m3.1-flash')).toContain('xhigh');
    expect(thinkingChoices('opencode', 'google/gemini-4-argon')).toEqual(['default', 'low', 'medium', 'high']);
    expect(thinkingChoices('opencode', 'opencode/grok-4.7')).toContain('xhigh');
    expect(thinkingChoices('opencode', 'opencode/mistral-large-4')).toEqual(['default', 'off', 'high']);
    expect(thinkingChoices('opencode', 'opencode/inkling-2-small-free')).toContain('max');
    expect(thinkingChoices('opencode', 'opencode-go/muse-spark-1.3-contributor')).toContain('max');
    expect(thinkingChoices('opencode', 'opencode/nemotron-3.5-super-vl-free')).toContain('off');
    expect(thinkingChoices('opencode', 'opencode/nemotron-3.5-lightning-free')).toEqual(['default']);

    expect(openCodeThinkingOptions('openrouter/anthropic/claude-opus-5.5', 'xhigh')).toEqual({ reasoning: { effort: 'xhigh' } });
    expect(openCodeThinkingOptions('openrouter/xiaomi/mimo-v2.6-pro', 'off')).toEqual({ reasoning: { enabled: false } });
    expect(openCodeThinkingOptions('google/gemini-4-argon', 'medium')).toEqual({ thinkingConfig: { thinkingLevel: 'medium' } });
    expect(openCodeThinkingOptions('opencode/mistral-large-4', 'off')).toEqual({ reasoningEffort: 'none' });
    expect(openCodeThinkingOptions('openrouter/anthropic/claude-opus-5.5', 'default')).toEqual({});
  });

  it('supports Qwen 3.8 Max, Hy4, Step 5, Ling and Beam per catalog', () => {
    expect(thinkingChoices('opencode', 'opencode/qwen3.8-max')).toEqual(['default', 'off', 'low', 'medium', 'xhigh']);
    expect(thinkingChoices('opencode', 'opencode-go/qwen3.8-max')).toEqual(['default', 'off', 'low', 'medium', 'xhigh']);
    for (const id of ['qwen3.8-max-0902', 'qwen3.8-max-prime']) {
      expect(thinkingChoices('opencode', `openrouter/qwen/${id}`)).toEqual(['default', 'low', 'medium', 'high', 'xhigh']);
    }
    expect(thinkingChoices('opencode', 'opencode-go/hy4')).toEqual(['default', 'off', 'high']);
    expect(thinkingChoices('opencode', 'openrouter/tencent/hy4')).toEqual(['default', 'off', 'high']);
    expect(thinkingChoices('opencode', 'opencode-go/step-5-preview')).toEqual(['default', 'low', 'medium', 'high']);
    expect(thinkingChoices('opencode', 'openrouter/stepfun/step-5-preview')).toEqual(['default', 'low', 'medium', 'high']);
    expect(thinkingChoices('opencode', 'openrouter/inclusionai/ling-3.1-flash')).toEqual(['default', 'off', 'on']);
    for (const id of ['opencode/beam-free', 'opencode-go/beam-free', 'openrouter/reflection/beam-1.0-501b-a23b']) {
      expect(thinkingChoices('opencode', id)).toEqual(['default', 'low', 'medium', 'high', 'xhigh', 'max']);
    }
    expect(openCodeThinkingOptions('opencode-go/hy4', 'off')).toEqual({ reasoningEffort: 'none' });
    expect(openCodeThinkingOptions('opencode-go/hy4', 'high')).toEqual({ reasoningEffort: 'high' });
    // Beam defaults to max on OpenRouter, so a saved `default` is replaced like Kimi's.
    expect(avoidsProviderDefault('openrouter/reflection/beam-1.0-501b-a23b')).toBe(true);
    expect(avoidsProviderDefault('opencode/beam-free')).toBe(true);
    expect(avoidsProviderDefault('opencode/glm-5.3')).toBe(false);
  });

  it('lists the current catalogs without superseded models', () => {
    expect(codexAdapter.modelsForProvider()).toEqual(['gpt-6.1-sol', 'gpt-6.1-terra', 'gpt-6-astra', 'gpt-6-sol', 'gpt-6-luna']);
    expect(opencodeAdapter.modelsForProvider('openai')).toEqual(['gpt-6.1-sol', 'gpt-6.1-terra', 'gpt-6-astra', 'gpt-6-sol', 'gpt-6-luna'].map(id => `openai/${id}`));
    expect(opencodeAdapter.modelsForProvider('opencode-zen')).not.toContain('opencode/kimi-k2.7-code');
    expect(opencodeAdapter.modelsForProvider('opencode-zen')).toContain('opencode/beam-free');
    expect(opencodeAdapter.modelsForProvider('google')).toEqual(['gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'].map(id => `google/${id}`));
    expect(opencodeAdapter.modelsForProvider('opencode-go')).toEqual(expect.arrayContaining(['opencode-go/hy4', 'opencode-go/step-5-preview', 'opencode-go/beam-free']));
    expect(opencodeAdapter.modelsForProvider('openrouter')).toEqual(expect.arrayContaining([
      'openrouter/qwen/qwen3.8-max-0902', 'openrouter/qwen/qwen3.8-max-prime', 'openrouter/tencent/hy4',
      'openrouter/stepfun/step-5-preview', 'openrouter/inclusionai/ling-3.1-flash', 'openrouter/reflection/beam-1.0-501b-a23b',
    ]));
  });

  it('keeps old Codex models and implicit medium/high reasoning', () => {
    const old: SimpleConfig = { default_model: 'gpt-5.6-terra', agents: [{ name: 'oracle', template: 'oracle', model: 'gpt-5.6-sol' }] };
    expect(CodexConfigSchema.parse(old)).toEqual(old);
    const root = mkdtempSync(join(tmpdir(), 'atelier-legacy-'));
    try {
      codexAdapter.mergeHarnessConfig(old, root);
      codexAdapter.installAgents(old, root);
      const native = TOML.parse(readFileSync(join(root, '.codex/config.toml'), 'utf8'));
      expect(native.model).toBe('gpt-5.6-terra');
      expect(native.model_reasoning_effort).toBe('medium');
      expect(native.plan_mode_reasoning_effort).toBeUndefined();
      const agent = TOML.parse(readFileSync(join(root, '.codex/agents/oracle.toml'), 'utf8'));
      expect(agent.model).toBe('gpt-5.6-sol');
      expect(agent.model_reasoning_effort).toBe('medium');
      // Without plan_thinking an existing plan_mode_reasoning_effort is left alone; `default` deletes it.
      const configPath = join(root, '.codex/config.toml');
      writeFileSync(configPath, TOML.stringify({ ...TOML.parse(readFileSync(configPath, 'utf8')), plan_mode_reasoning_effort: 'xhigh' }));
      codexAdapter.mergeHarnessConfig(old, root);
      expect(TOML.parse(readFileSync(configPath, 'utf8')).plan_mode_reasoning_effort).toBe('xhigh');
      const fresh = codexAdapter.defaultSection() as CodexConfig;
      fresh.build_thinking = 'default';
      fresh.plan_thinking = 'default';
      codexAdapter.mergeHarnessConfig(fresh, root);
      const updated = TOML.parse(readFileSync(configPath, 'utf8'));
      expect(updated.model_reasoning_effort).toBeUndefined();
      expect(updated.plan_mode_reasoning_effort).toBeUndefined();
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('preserves unrelated Claude per-model settings during generation and removal', () => {
    const root = mkdtempSync(join(tmpdir(), 'atelier-claude-thinking-'));
    try {
      mkdirSync(join(root, '.claude'));
      const file = join(root, '.claude/settings.json');
      writeFileSync(file, JSON.stringify({ modelSettings: { custom: { effortLevel: 'low' }, 'claude-opus-5-5': { maxEffortLevel: 'xhigh' } } }));
      const config = claudeAdapter.defaultSection();
      claudeAdapter.mergeHarnessConfig(config, root);
      expect(JSON.parse(readFileSync(file, 'utf8')).modelSettings['claude-opus-5-5']).toEqual({ maxEffortLevel: 'xhigh', effortLevel: 'high' });
      claudeAdapter.remove(config, root);
      expect(JSON.parse(readFileSync(file, 'utf8')).modelSettings).toEqual({ custom: { effortLevel: 'low' }, 'claude-opus-5-5': { maxEffortLevel: 'xhigh' } });
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  describe('legacy opusplan auto-compact window', () => {
    // Earlier Atelier versions wrote autoCompactWindow: 190000 for opusplan. Claude Code no longer swaps
    // models, so merge and remove only clean up that exact value on the two legacy model entries.
    const withRoot = (run: (root: string) => void) => {
      const root = mkdtempSync(join(tmpdir(), 'atelier-compact-'));
      try { run(root); } finally { rmSync(root, { recursive: true, force: true }); }
    };
    const seed = (root: string, modelSettings: Record<string, unknown>) => {
      mkdirSync(join(root, '.claude'), { recursive: true });
      writeFileSync(join(root, '.claude/settings.json'), JSON.stringify({ modelSettings }));
    };
    const modelSettingsOf = (root: string): Record<string, Record<string, unknown>> => {
      const file = join(root, '.claude/settings.json');
      return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')).modelSettings ?? {}) : {};
    };

    it('never writes the window for the current default model', () => withRoot(root => {
      claudeAdapter.mergeHarnessConfig(claudeAdapter.defaultSection(), root);
      expect(JSON.stringify(modelSettingsOf(root))).not.toContain('autoCompactWindow');
    }));

    it('merge removes a 190k window left on the legacy model entries only', () => withRoot(root => {
      seed(root, {
        'claude-opus-5-5': { autoCompactWindow: 190000 },
        'claude-sonnet-5-5': { autoCompactWindow: 190000, effortLevel: 'low' },
        'claude-haiku-5-5': { autoCompactWindow: 190000 },
      });
      claudeAdapter.mergeHarnessConfig(claudeAdapter.defaultSection(), root);
      const settings = modelSettingsOf(root);
      expect(settings['claude-opus-5-5']).toEqual({ effortLevel: 'high' });
      expect(settings['claude-sonnet-5-5']).toEqual({ effortLevel: 'low' });
      expect(settings['claude-haiku-5-5']).toEqual({ autoCompactWindow: 190000 });
    }));

    it('keeps a window the user set to another value, through merge and remove', () => withRoot(root => {
      seed(root, { 'claude-opus-5-5': { autoCompactWindow: 250000 }, 'claude-sonnet-5-5': { autoCompactWindow: 190000 } });
      const config = claudeAdapter.defaultSection();
      claudeAdapter.mergeHarnessConfig(config, root);
      expect(modelSettingsOf(root)['claude-opus-5-5']).toEqual({ autoCompactWindow: 250000, effortLevel: 'high' });
      expect(modelSettingsOf(root)['claude-sonnet-5-5']).toBeUndefined();
      claudeAdapter.remove(config, root);
      expect(modelSettingsOf(root)).toEqual({ 'claude-opus-5-5': { autoCompactWindow: 250000 } });
    }));

    it('keeps a user Sonnet effort when the model is not opusplan, through merge and remove', () => withRoot(root => {
      mkdirSync(join(root, '.claude'), { recursive: true });
      writeFileSync(join(root, '.claude/settings.json'), JSON.stringify({ model: 'sonnet', modelSettings: { 'claude-sonnet-5-5': { effortLevel: 'low' } } }));
      const config = claudeAdapter.defaultSection();
      claudeAdapter.mergeHarnessConfig(config, root);
      expect(modelSettingsOf(root)['claude-sonnet-5-5']).toEqual({ effortLevel: 'low' });
      claudeAdapter.remove(config, root);
      expect(modelSettingsOf(root)).toEqual({ 'claude-sonnet-5-5': { effortLevel: 'low' } });
    }));

    it('upgrades a 3.7.0 opusplan settings.json and then removes the same legacy file', () => withRoot(root => {
      const file = join(root, '.claude/settings.json');
      const legacy = JSON.stringify({
        $schema: 'https://json.schemastore.org/claude-code-settings.json',
        model: 'opusplan',
        modelSettings: {
          'claude-sonnet-5-5': { effortLevel: 'high', autoCompactWindow: 190000 },
          'claude-opus-5-5': { effortLevel: 'max', autoCompactWindow: 190000 },
        },
      });
      mkdirSync(join(root, '.claude'), { recursive: true });
      writeFileSync(file, legacy);

      const config = claudeAdapter.defaultSection();
      config.build_thinking = 'medium';
      claudeAdapter.mergeHarnessConfig(config, root);
      const merged = JSON.parse(readFileSync(file, 'utf8'));
      expect(merged.model).toBe('opus');
      expect(merged.modelSettings).toEqual({ 'claude-opus-5-5': { effortLevel: 'medium' } });

      writeFileSync(file, legacy);
      claudeAdapter.remove(config, root);
      expect(existsSync(file)).toBe(false);
    }));

    it('remove clears a 190k window on a legacy entry and leaves other values alone', () => withRoot(root => {
      seed(root, {
        'claude-sonnet-5-5': { autoCompactWindow: 190000, effortLevel: 'low' },
        'claude-opus-5-5': { autoCompactWindow: 200000 },
      });
      claudeAdapter.remove(claudeAdapter.defaultSection(), root);
      expect(modelSettingsOf(root)).toEqual({ 'claude-sonnet-5-5': { effortLevel: 'low' }, 'claude-opus-5-5': { autoCompactWindow: 200000 } });
    }));
  });

  it('clears stale OpenCode thinking while preserving permissions and provider options', () => {
    const root = mkdtempSync(join(tmpdir(), 'atelier-open-thinking-'));
    try {
      const file = join(root, 'opencode.json');
      writeFileSync(file, JSON.stringify({ agent: { build: { effort: 'max', thinking: { type: 'adaptive' }, permission: { bash: 'ask' } } }, provider: { 'amazon-bedrock': { options: { profile: 'work' } } } }));
      const config = opencodeAdapter.defaultSection('amazon-bedrock') as OpenCodeConfig;
      opencodeAdapter.mergeHarnessConfig(config, root);
      let native = JSON.parse(readFileSync(file, 'utf8'));
      expect(native.agent.build.effort).toBeUndefined();
      expect(native.agent.build.thinking).toBeUndefined();
      expect(native.agent.build.reasoningConfig.maxReasoningEffort).toBe('high');
      opencodeAdapter.remove(config, root);
      native = JSON.parse(readFileSync(file, 'utf8'));
      expect(native.agent.build).toEqual({ permission: { bash: 'ask' } });
      expect(native.provider['amazon-bedrock']).toEqual({ options: { profile: 'work' } });
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
