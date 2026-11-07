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
import { thinkingChoices, openCodeThinkingOptions } from '../utils/thinking.js';
import type { HarnessAdapter, SimpleConfig, OpenCodeConfig, Provider } from '../types.js';

// Each row: the four agent models then the single session model; the four agent levels then the session thinking.
const cases: Array<[HarnessAdapter, Provider, string[], string[]]> = [
  [claudeAdapter, 'anthropic', ['haiku', 'opus', 'opus', 'sonnet', 'claude-opus-5-5'], ['default', 'xhigh', 'high', 'default', 'high']],
  [codexAdapter, 'openai', ['gpt-6-luna', 'gpt-6-astra', 'gpt-6-astra', 'gpt-6-sol', 'gpt-6-astra'], ['low', 'high', 'xhigh', 'medium', 'high']],
  [opencodeAdapter, 'openai', ['openai/gpt-6-luna', 'openai/gpt-6-astra', 'openai/gpt-6-astra', 'openai/gpt-6-sol', 'openai/gpt-6-astra'], ['low', 'high', 'xhigh', 'high', 'high']],
  [opencodeAdapter, 'amazon-bedrock', ['amazon-bedrock/us.anthropic.claude-haiku-5-5', 'amazon-bedrock/us.anthropic.claude-fable-5-1', 'amazon-bedrock/us.anthropic.claude-opus-5-5', 'amazon-bedrock/us.anthropic.claude-sonnet-5-5', 'amazon-bedrock/us.anthropic.claude-opus-5-5'], ['low', 'high', 'high', 'default', 'high']],
  [opencodeAdapter, 'opencode-zen', ['opencode/glm-5.3-flash', 'opencode/kimi-k3', 'opencode/glm-5.3', 'opencode/deepseek-v4.1-flash', 'opencode/kimi-k3'], ['low', 'high', 'high', 'high', 'high']],
  [opencodeAdapter, 'opencode-go', ['opencode-go/glm-5.3-flash', 'opencode-go/mimo-v2.6-pro', 'opencode-go/glm-5.3', 'opencode-go/deepseek-v4.1-flash', 'opencode-go/kimi-k3.1-pro'], ['low', 'on', 'high', 'high', 'high']],
  [opencodeAdapter, 'openrouter', ['openrouter/z-ai/glm-5.3-flash', 'openrouter/moonshotai/kimi-k3.1-pro', 'openrouter/z-ai/glm-5.3', 'openrouter/deepseek/deepseek-v4.1-flash-1017', 'openrouter/moonshotai/kimi-k3.1-pro'], ['low', 'high', 'high', 'high', 'high']],
  [opencodeAdapter, 'google', ['google/gemini-3.5-flash-lite', 'google/gemini-4-argon', 'google/gemini-4-argon', 'google/gemini-3.8-flash', 'google/gemini-4-argon'], ['low', 'high', 'high', 'high', 'high']],
];

// Where each OpenCode provider carries the selected effort in its native options.
const effortOf = (provider: Provider, o: any): unknown =>
  provider === 'amazon-bedrock' ? o.reasoningConfig?.maxReasoningEffort
    : provider === 'openrouter' ? o.reasoning?.effort
    : provider === 'google' ? o.thinkingConfig?.thinkingLevel
    : o.reasoningEffort;

describe('model and thinking settings', () => {
  for (const [adapter, provider, models, levels] of cases) {
    it(`${adapter.name}/${provider}: generates four agent assignments and one session model/thinking pair, then removes them`, () => {
      const root = mkdtempSync(join(tmpdir(), 'atelier-models-'));
      try {
        const config = adapter.defaultSection(provider) as SimpleConfig | OpenCodeConfig;
        expect(adapter.configSchema.safeParse(config).success).toBe(true);
        expect(config.agents.map(a => a.model)).toEqual(models.slice(0, 4));
        expect([...config.agents.map(a => a.thinking), config.build_thinking]).toEqual(levels);
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
          // Claude keys session effort by model id, and the session model is the bare alias.
          expect(native.model).toBe('opus');
          expect(native.modelSettings[models[4]].effortLevel).toBe(levels[4]);
          expect(native.modelSettings[models[4]].autoCompactWindow).toBeUndefined();
        } else if (adapter.name === 'codex') {
          expect(native.model).toBe(models[4]);
          expect(native.model_reasoning_effort).toBe(levels[4]);
          expect(native.plan_mode_reasoning_effort).toBeUndefined();
        } else {
          expect(native.agent.plan).toBeUndefined();
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
    expect(OpenCodeConfigSchema.safeParse({ ...zen, default_model: 'custom/unknown', build_thinking: 'default' }).success).toBe(true);
    const mimo = opencodeAdapter.defaultSection('opencode-go') as OpenCodeConfig;
    mimo.agents[1].thinking = 'high';
    expect(OpenCodeConfigSchema.safeParse(mimo).success).toBe(false);
    // GLM 5.3 session thinking allows only default, low, high and max.
    expect(OpenCodeConfigSchema.safeParse({ ...zen, default_model: 'opencode/glm-5.3', build_thinking: 'high' }).success).toBe(true);
    expect(OpenCodeConfigSchema.safeParse({ ...zen, default_model: 'opencode/glm-5.3', build_thinking: 'medium' }).success).toBe(false);
    const claude = claudeAdapter.defaultSection() as SimpleConfig;
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
      // A plan_mode_reasoning_effort left by an older Atelier version is dropped on the next merge.
      const configPath = join(root, '.codex/config.toml');
      writeFileSync(configPath, TOML.stringify({ ...TOML.parse(readFileSync(configPath, 'utf8')), plan_mode_reasoning_effort: 'high' }));
      const fresh = codexAdapter.defaultSection() as SimpleConfig;
      fresh.build_thinking = 'default';
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
