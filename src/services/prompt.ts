import inquirer from 'inquirer';
import type { HarnessAdapter, HarnessSection, SimpleConfig, OpenCodeConfig, Provider, ProviderChoice } from '../types.js';
import { AGENT_NAMES } from '../constants.js';
import { InvalidConfigError } from '../utils/errors.js';
import { avoidsProviderDefault, recommendedThinking, thinkingChoices, type Thinking, type ThinkingHarness } from '../utils/thinking.js';

export async function promptForSection(adapter: HarnessAdapter, section: HarnessSection): Promise<HarnessSection> {
  return adapter.promptSection(inquirer, section);
}

export async function promptForOpenCodeProvider(
  prompt: typeof inquirer,
  choices: ProviderChoice[],
  current?: OpenCodeConfig['provider'],
): Promise<OpenCodeConfig['provider']> {
  const answer = await prompt.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Which provider are you using?',
      choices,
      default: current,
    },
  ]);
  return answer.provider as OpenCodeConfig['provider'];
}

export async function promptForSimpleModels(
  prompt: typeof inquirer,
  section: SimpleConfig,
  models: readonly string[],
  harness: 'claude' | 'codex' = 'claude',
): Promise<SimpleConfig> {
  const answers = await prompt.prompt([
    {
      type: 'list',
      name: 'default_model',
      message: 'Select default model',
      choices: modelChoices(models, section.default_model),
      default: section.default_model,
    },
    ...AGENT_NAMES.map(name => ({
      type: 'list' as const,
      name,
      message: `Select model for ${name}`,
      choices: modelChoices(models, section.agents.find(a => a.name === name)?.model),
      default: section.agents.find(a => a.name === name)?.model || models[0],
    })),
  ]);

  const selectedModel = answers.default_model || section.default_model;
  const result: SimpleConfig = {
    ...section,
    default_model: selectedModel,
    agents: AGENT_NAMES.map(name => {
      const agent = section.agents.find(a => a.name === name);
      return {
        ...agent,
        template: name,
        name,
        model: answers[name] || agent?.model || models[0],
      };
    }),
  };
  await promptThinking(prompt, harness, result, section);
  return result;
}

export async function promptForOpenCodeModels(
  prompt: typeof inquirer,
  section: OpenCodeConfig,
  models: readonly string[],
  provider: OpenCodeConfig['provider'],
): Promise<OpenCodeConfig> {
  const answers = await prompt.prompt([
    {
      type: 'list',
      name: 'default_model',
      message: 'Select model',
      choices: modelChoices(models, section.default_model),
      default: section.default_model,
    },
    ...AGENT_NAMES.map(name => ({
      type: 'list' as const,
      name,
      message: `Select model for ${name}`,
      choices: modelChoices(models, section.agents.find(a => a.name === name)?.model),
      default: section.agents.find(a => a.name === name)?.model || models[0],
    })),
  ]);

  const result: OpenCodeConfig = {
    ...section,
    provider,
    default_model: answers.default_model || section.default_model,
    agents: AGENT_NAMES.map(name => {
      const agent = section.agents.find(a => a.name === name);
      return {
        ...agent,
        template: name,
        name,
        model: answers[name] || agent?.model || models[0],
      };
    }),
  };
  await promptThinking(prompt, 'opencode', result, section);
  return result;
}

function modelChoices(models: readonly string[], saved?: string): string[] {
  return [...new Set([...models, ...(saved ? [saved] : [])])];
}

async function promptThinking(prompt: typeof inquirer, harness: ThinkingHarness, config: SimpleConfig | OpenCodeConfig, previous: SimpleConfig | OpenCodeConfig): Promise<void> {
  const slots: Array<{ name: string; label: string; model: string; oldModel: string; saved?: Thinking; session: boolean; set: (value: Thinking | undefined) => void }> = [{
    name: 'build_thinking', label: 'session',
    model: config.default_model,
    oldModel: previous.default_model,
    saved: previous.build_thinking, session: true,
    set: (value: Thinking | undefined) => { config.build_thinking = value; },
  }];
  for (const agent of config.agents) {
    const old = previous.agents.find(a => a.name === agent.name);
    slots.push({ name: `${agent.name}_thinking`, label: agent.name, model: agent.model, oldModel: old?.model ?? '', saved: old?.thinking, session: false, set: value => { agent.thinking = value; } });
  }
  const questions = slots.map(slot => {
    const choices = thinkingChoices(harness, slot.model, slot.session);
    const recommended = recommendedThinking(slot.model, slot.label).filter(level => choices.includes(level));
    const fallback = recommended[0] ?? 'default';
    const keep = slot.model === slot.oldModel && (slot.saved === undefined || choices.includes(slot.saved));
    const saved = keep ? (slot.saved === 'default' && avoidsProviderDefault(slot.model) ? fallback : slot.saved) : fallback;
    slot.set(saved);
    return {
      type: 'list' as const, name: slot.name, message: `Select thinking for ${slot.label} (${slot.model})`,
      choices: [
        ...(saved === undefined ? [{ name: 'Keep existing behavior', value: 'keep' }] : []),
        ...choices.map(level => ({ name: recommended.includes(level) ? `${level} (recommended)` : level, value: level })),
      ],
      default: saved ?? 'keep',
    };
  });
  const answers = await prompt.prompt(questions);
  for (const slot of slots) {
    if (answers[slot.name] !== undefined) slot.set(answers[slot.name] === 'keep' ? undefined : answers[slot.name] as Thinking);
  }
}

export function formatFileList(files: { path: string; exists: boolean; action?: 'delete' }[]): string {
  return files.map(f => `  ${f.action === 'delete' ? '-' : f.exists ? '~' : '+'} ${f.path}`).join('\n');
}

export function guardProvider(provider: Provider | undefined): OpenCodeConfig['provider'] {
  if (!provider || !['opencode-zen', 'opencode-go', 'amazon-bedrock', 'openai', 'openrouter', 'google'].includes(provider)) {
    throw new InvalidConfigError('A valid provider must be selected for OpenCode');
  }
  return provider as OpenCodeConfig['provider'];
}
