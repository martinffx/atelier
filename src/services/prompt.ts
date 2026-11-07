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

// Asks for the session model and one model per agent; shared by every harness's model prompt.
async function promptModels(
  prompt: typeof inquirer,
  section: SimpleConfig | OpenCodeConfig,
  models: readonly string[],
): Promise<Pick<SimpleConfig, 'default_model' | 'agents'>> {
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

  return {
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
}

export async function promptForSimpleModels(
  prompt: typeof inquirer,
  section: SimpleConfig,
  models: readonly string[],
  harness: 'claude' | 'codex' = 'claude',
): Promise<SimpleConfig> {
  const result: SimpleConfig = { ...section, ...await promptModels(prompt, section, models) };
  await promptThinking(prompt, harness, result, section);
  return result;
}

export async function promptForOpenCodeModels(
  prompt: typeof inquirer,
  section: OpenCodeConfig,
  models: readonly string[],
  provider: OpenCodeConfig['provider'],
): Promise<OpenCodeConfig> {
  const result: OpenCodeConfig = { ...section, provider, ...await promptModels(prompt, section, models) };
  await promptThinking(prompt, 'opencode', result, section);
  if (provider === 'openrouter') {
    const { warming } = await prompt.prompt([{
      type: 'confirm',
      name: 'warming',
      message: 'Keep idle sessions warm? This sends keep-alive requests every few minutes, which cost money (requires OpenCode V2)',
      default: section.warming ?? false,
    }]);
    if (warming !== undefined) result.warming = warming;
  }
  return result;
}

function modelChoices(models: readonly string[], saved?: string): string[] {
  return [...new Set([...models, ...(saved ? [saved] : [])])];
}

async function promptThinking(prompt: typeof inquirer, harness: Harness, config: SimpleConfig | CodexConfig | OpenCodeConfig, previous: SimpleConfig | CodexConfig | OpenCodeConfig): Promise<void> {
  // `role` picks the recommendation row; `label` is what the user reads. Claude has one session effort,
  // while Codex and OpenCode have separate build and plan efforts on the same model.
  const slots: Array<{ name: string; role: Slot; label: string; model: string; oldModel: string; saved?: Thinking; session: boolean; set: (value: Thinking | undefined) => void }> = [{
    name: 'build_thinking', role: 'session', label: harness === 'claude' ? 'session' : 'build',
    model: config.default_model,
    oldModel: previous.default_model,
    saved: previous.build_thinking, session: true,
    set: (value: Thinking | undefined) => { config.build_thinking = value; },
  }];
  if (harness !== 'claude') {
    const planConfig = config as CodexConfig | OpenCodeConfig;
    slots.push({
      name: 'plan_thinking', role: 'plan', label: 'plan',
      model: config.default_model,
      oldModel: previous.default_model,
      saved: (previous as CodexConfig | OpenCodeConfig).plan_thinking, session: false,
      set: value => { planConfig.plan_thinking = value; },
    });
  }
  for (const agent of config.agents) {
    const old = previous.agents.find(a => a.name === agent.name);
    slots.push({ name: `${agent.name}_thinking`, role: agent.name, label: agent.name, model: agent.model, oldModel: old?.model ?? '', saved: old?.thinking, session: false, set: value => { agent.thinking = value; } });
  }
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
