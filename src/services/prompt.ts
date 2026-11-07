import inquirer from 'inquirer';
import type { Harness, HarnessAdapter, HarnessSection, SimpleConfig, CodexConfig, OpenCodeConfig, Provider, ProviderChoice } from '../types.js';
import { AGENT_NAMES } from '../constants.js';
import { InvalidConfigError } from '../utils/errors.js';
import { avoidsProviderDefault, recommendedThinking, thinkingChoices, type Slot, type Thinking } from '../utils/thinking.js';

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

type AnyConfig = SimpleConfig | CodexConfig | OpenCodeConfig;

export async function promptForSimpleModels(
  prompt: typeof inquirer,
  section: SimpleConfig,
  models: readonly string[],
  harness: 'claude' | 'codex' = 'claude',
  recommended?: SimpleConfig,
): Promise<SimpleConfig> {
  const result: SimpleConfig = { ...section };
  await promptModelsAndThinking(prompt, harness, result, section, models, recommended);
  return result;
}

export async function promptForOpenCodeModels(
  prompt: typeof inquirer,
  section: OpenCodeConfig,
  models: readonly string[],
  provider: OpenCodeConfig['provider'],
  recommended?: OpenCodeConfig,
): Promise<OpenCodeConfig> {
  const result: OpenCodeConfig = { ...section, provider };
  await promptModelsAndThinking(prompt, 'opencode', result, section, models, recommended);
  if (provider === 'openrouter') {
    const { warming } = await prompt.prompt([{
      type: 'confirm',
      name: 'warming',
      message: 'Keep idle sessions warm? This sends keep-alive requests every few minutes, which cost money (requires OpenCode 2.2.6 or later)',
      default: section.warming ?? false,
    }]);
    if (warming !== undefined) result.warming = warming;
  }
  return result;
}

function modelChoices(models: readonly string[], saved?: string, recommended?: string): Array<{ name: string; value: string }> {
  return [...new Set([...models, ...(saved ? [saved] : [])])].map(value => ({ name: value === recommended ? `${value} (recommended)` : value, value }));
}

// Walks the session then each agent: asks its model, then straight away its thinking. Updates `config` in place.
async function promptModelsAndThinking(
  prompt: typeof inquirer,
  harness: Harness,
  config: AnyConfig,
  previous: AnyConfig,
  models: readonly string[],
  recommended?: AnyConfig,
): Promise<void> {
  const hasPlan = harness !== 'claude';
  const sessionAnswer = await prompt.prompt([{
    type: 'list',
    name: 'default_model',
    message: 'Select default model',
    choices: modelChoices(models, previous.default_model, recommended?.default_model),
    default: previous.default_model,
  }]);
  config.default_model = sessionAnswer.default_model || previous.default_model;
  const planConfig = config as CodexConfig | OpenCodeConfig;
  await promptThinking(prompt, [{
    name: 'build_thinking', role: 'session', label: harness === 'claude' ? 'session' : 'build',
    model: config.default_model,
    oldModel: previous.default_model,
    saved: previous.build_thinking, session: true,
    set: value => { config.build_thinking = value; },
  }, ...(hasPlan ? [{
    name: 'plan_thinking', role: 'plan' as const, label: 'plan',
    model: config.default_model,
    oldModel: previous.default_model,
    saved: (previous as CodexConfig | OpenCodeConfig).plan_thinking, session: false,
    set: (value: Thinking | undefined) => { planConfig.plan_thinking = value; },
  }] : [])], harness);

  const agents: AnyConfig['agents'] = [];
  for (const name of AGENT_NAMES) {
    const old = previous.agents.find(a => a.name === name);
    const answer = await prompt.prompt([{
      type: 'list',
      name,
      message: `Select model for ${name}`,
      choices: modelChoices(models, old?.model, recommended?.agents.find(a => a.name === name)?.model),
      default: old?.model || models[0],
    }]);
    const agent = { ...old, template: name, name, model: answer[name] || old?.model || models[0] } as AnyConfig['agents'][number];
    agents.push(agent);
    await promptThinking(prompt, [{
      name: `${name}_thinking`, role: name, label: name, model: agent.model, oldModel: old?.model ?? '', saved: old?.thinking, session: false,
      set: value => { agent.thinking = value; },
    }], harness);
  }
  config.agents = agents;
}

interface ThinkingSlot {
  name: string;
  role: Slot;
  label: string;
  model: string;
  oldModel: string;
  saved?: Thinking;
  session: boolean;
  set: (value: Thinking | undefined) => void;
}

// One prompt call for the given slots. `role` picks the recommendation row; `label` is what the user reads.
async function promptThinking(prompt: typeof inquirer, slots: ThinkingSlot[], harness: Harness): Promise<void> {
  const questions = slots.map(slot => {
    const choices = thinkingChoices(harness, slot.model, slot.session);
    const recommended = recommendedThinking(slot.model, slot.role).filter(level => choices.includes(level));
    const fallback = recommended[0] ?? 'default';
    const unchanged = slot.model === slot.oldModel && (slot.saved === undefined || choices.includes(slot.saved));
    const preselected = unchanged ? (slot.saved === 'default' && avoidsProviderDefault(slot.model) ? fallback : slot.saved) : fallback;
    slot.set(preselected);
    return {
      type: 'list' as const, name: slot.name, message: `Select thinking for ${slot.label} (${slot.model})`,
      choices: [
        ...(preselected === undefined ? [{ name: 'Keep existing behavior', value: 'keep' }] : []),
        ...choices.map(level => ({ name: recommended.includes(level) ? `${level} (recommended)` : level, value: level })),
      ],
      default: preselected ?? 'keep',
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
