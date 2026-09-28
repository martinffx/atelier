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

const cases: Array<[HarnessAdapter, Provider, string[], string[]]> = [
  [claudeAdapter, 'anthropic', ['haiku', 'fable', 'opus', 'claude-opus-5-5', 'claude-sonnet-5'], ['default', 'high', 'high', 'high', 'high']],
  [codexAdapter, 'openai', ['gpt-6-luna', 'gpt-6-astra', 'gpt-6-astra', 'gpt-6-sol', 'gpt-6-sol'], ['low', 'high', 'xhigh', 'xhigh', 'high']],
  [opencodeAdapter, 'openai', ['openai/gpt-6-luna', 'openai/gpt-6-astra', 'openai/gpt-6-astra', 'openai/gpt-6-astra', 'openai/gpt-6-sol'], ['low', 'high', 'xhigh', 'xhigh', 'high']],
  [opencodeAdapter, 'amazon-bedrock', ['amazon-bedrock/us.anthropic.claude-haiku-4-5-20251001-v1:0', 'amazon-bedrock/us.anthropic.claude-fable-5-1', 'amazon-bedrock/us.anthropic.claude-opus-5-5', 'amazon-bedrock/us.anthropic.claude-opus-5-5', 'amazon-bedrock/us.anthropic.claude-sonnet-5'], ['default', 'high', 'high', 'high', 'high']],
  [opencodeAdapter, 'opencode-zen', ['opencode/glm-5.3-flash', 'opencode/kimi-k3', 'opencode/glm-5.3', 'opencode/glm-5.3', 'opencode/deepseek-v4.1-flash'], ['low', 'high', 'high', 'high', 'high']],
  [opencodeAdapter, 'opencode-go', ['opencode-go/glm-5.3-flash', 'opencode-go/mimo-v2.6-pro', 'opencode-go/glm-5.3', 'opencode-go/glm-5.3', 'opencode-go/deepseek-v4.1-flash'], ['low', 'on', 'high', 'high', 'high']],
];

describe('model and thinking settings', () => {
  for (const [adapter, provider, models, levels] of cases) {
    it(`${adapter.name}/${provider}: generates all five assignments and removes them`, () => {
      const root = mkdtempSync(join(tmpdir(), 'atelier-models-'));
      try {
        const config = adapter.defaultSection(provider) as SimpleConfig | OpenCodeConfig;
        expect(adapter.configSchema.safeParse(config).success).toBe(true);
        expect(config.agents.map(a => a.model)).toEqual(models.slice(0, 3));
        expect([...config.agents.map(a => a.thinking), config.plan_thinking, config.build_thinking]).toEqual(levels);
        for (const agent of config.agents) expect(adapter.modelsForProvider(provider)).toContain(agent.model);
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
          else if (adapter.name === 'claude') expect(data.effort).toBe(index === 0 ? undefined : levels[index]);
          else {
            expect(data.temperature).toBeUndefined();
            if (provider === 'amazon-bedrock') expect(data.reasoningConfig?.maxReasoningEffort).toBe(index === 0 ? undefined : levels[index]);
            else if (provider === 'opencode-go' && index === 1) expect(data.thinking).toEqual({ type: 'enabled' });
            else expect(data.reasoningEffort).toBe(levels[index]);
          }
        });
        if (adapter.name === 'claude') {
          expect(native.model).toBe('opusplan');
          expect(native.modelSettings[models[3]].effortLevel).toBe(levels[3]);
          expect(native.modelSettings[models[4]].effortLevel).toBe(levels[4]);
        } else if (adapter.name === 'codex') {
          expect(native.model).toBe(models[4]);
          expect(native.plan_mode_reasoning_effort).toBe(levels[3]);
          expect(native.model_reasoning_effort).toBe(levels[4]);
        } else {
          for (const [mode, index] of [['plan', 3], ['build', 4]] as const) {
            expect(native.agent[mode].model).toBe(models[index]);
            expect(adapter.modelsForProvider(provider)).toContain(models[index]);
            expect(provider === 'amazon-bedrock' ? native.agent[mode].reasoningConfig.maxReasoningEffort : native.agent[mode].reasoningEffort).toBe(levels[index]);
          }
        }
        adapter.remove(config, root);
        expect(existsSync(nativePath)).toBe(false);
      } finally { rmSync(root, { recursive: true, force: true }); }
    });
  }

  it('rejects unsupported effort without inventing levels for custom models', () => {
    const glm = opencodeAdapter.defaultSection('opencode-zen') as OpenCodeConfig;
    expect(OpenCodeConfigSchema.safeParse({ ...glm, plan_thinking: 'medium' }).success).toBe(false);
    const mimo = opencodeAdapter.defaultSection('opencode-go') as OpenCodeConfig;
    mimo.agents[1].thinking = 'high';
    expect(OpenCodeConfigSchema.safeParse(mimo).success).toBe(false);
    const claude = claudeAdapter.defaultSection() as SimpleConfig;
    expect(ClaudeConfigSchema.safeParse({ ...claude, build_thinking: 'max' }).success).toBe(false);
    claude.agents[0].thinking = 'low';
    expect(ClaudeConfigSchema.safeParse(claude).success).toBe(false);
    expect(thinkingChoices('codex', 'gpt-6-astra')).not.toContain('off');
    expect(thinkingChoices('codex', 'gpt-6-sol')).toContain('off');
    expect(thinkingChoices('opencode', 'custom/unknown')).toEqual(['default']);
    expect(openCodeThinkingOptions('openai/gpt-6-luna', 'off')).toEqual({ reasoningEffort: 'none' });
    expect(openCodeThinkingOptions('opencode-go/mimo-v2.6-pro', 'off')).toEqual({ thinking: { type: 'disabled' } });
    expect(openCodeThinkingOptions('opencode/claude-opus-5-5', 'high')).toEqual({ effort: 'high' });
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
      expect(native.plan_mode_reasoning_effort).toBe('high');
      const agent = TOML.parse(readFileSync(join(root, '.codex/agents/oracle.toml'), 'utf8'));
      expect(agent.model).toBe('gpt-5.6-sol');
      expect(agent.model_reasoning_effort).toBe('medium');
      const fresh = codexAdapter.defaultSection() as SimpleConfig;
      fresh.build_thinking = 'default'; fresh.plan_thinking = 'default';
      codexAdapter.mergeHarnessConfig(fresh, root);
      const updated = TOML.parse(readFileSync(join(root, '.codex/config.toml'), 'utf8'));
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
