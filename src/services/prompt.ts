import inquirer from 'inquirer';
import type { HarnessAdapter, HarnessSection, SimpleConfig, OpenCodeConfig, Provider, ProviderChoice } from '../types.js';
import { AGENT_NAMES } from '../constants.js';
import { InvalidConfigError } from '../utils/errors.js';
import { thinkingChoices, type Thinking, type ThinkingHarness } from '../utils/thinking.js';

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
      name: 'build_model',
      message: 'Select model for build',
      choices: modelChoices(models, section.build_model),
      default: section.build_model,
    },
    {
      type: 'list',
      name: 'plan_model',
      message: 'Select model for plan',
      choices: modelChoices(models, section.plan_model),
      default: section.plan_model,
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
    build_model: answers.build_model || section.build_model,
    plan_model: answers.plan_model || section.plan_model,
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
  const modelFor = (section: SimpleConfig | OpenCodeConfig, mode: 'build' | 'plan') => 'default_model' in section ? section.default_model : section[`${mode}_model`];
  const slots: Array<{ name: string; label: string; model: string; oldModel: string; saved?: Thinking; session: boolean; set: (value: Thinking | undefined) => void }> = (['build', 'plan'] as const).filter(mode => !(mode === 'plan' && harness === 'claude' && modelFor(config, mode) !== 'opusplan')).map(mode => ({
    name: `${mode}_thinking`, label: mode,
    model: modelFor(config, mode),
    oldModel: modelFor(previous, mode),
    saved: previous[`${mode}_thinking`], session: true,
    set: (value: Thinking | undefined) => { config[`${mode}_thinking`] = value; },
  }));
  for (const agent of config.agents) {
    const old = previous.agents.find(a => a.name === agent.name);
    slots.push({ name: `${agent.name}_thinking`, label: agent.name, model: agent.model, oldModel: old?.model ?? '', saved: old?.thinking, session: false, set: value => { agent.thinking = value; } });
  }
  const questions = slots.map(slot => {
    const choices = thinkingChoices(harness, slot.model, slot.session);
    const saved = slot.model === slot.oldModel && (slot.saved === undefined || choices.includes(slot.saved)) ? slot.saved : 'default';
    slot.set(saved);
    return {
      type: 'list' as const, name: slot.name, message: `Select thinking for ${slot.label} (${slot.model})`,
      choices: saved === undefined ? [{ name: 'Keep existing behavior', value: 'keep' }, ...choices] : choices,
      default: saved ?? 'keep',
    };
  });
  const answers = await prompt.prompt(questions);
  for (const slot of slots) {
    if (answers[slot.name] !== undefined) slot.set(answers[slot.name] === 'keep' ? undefined : answers[slot.name] as Thinking);
  }
  if (harness === 'claude' && 'default_model' in config && config.default_model !== 'opusplan') config.plan_thinking = config.build_thinking;
}

export function formatFileList(files: { path: string; exists: boolean; action?: 'delete' }[]): string {
  return files.map(f => `  ${f.action === 'delete' ? '-' : f.exists ? '~' : '+'} ${f.path}`).join('\n');
}

export function guardProvider(provider: Provider | undefined): OpenCodeConfig['provider'] {
  if (!provider || !['opencode-zen', 'opencode-go', 'amazon-bedrock', 'openai'].includes(provider)) {
    throw new InvalidConfigError('A valid provider must be selected for OpenCode');
  }
  return provider as OpenCodeConfig['provider'];
}
