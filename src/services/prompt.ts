import inquirer from 'inquirer';
import type { HarnessAdapter, HarnessSection, SimpleConfig, OpenCodeConfig, Provider, ProviderChoice } from '../types.js';
import { AGENT_NAMES } from '../constants.js';
import { InvalidConfigError } from '../utils/errors.js';

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
): Promise<SimpleConfig> {
  const answers = await prompt.prompt([
    {
      type: 'list',
      name: 'default_model',
      message: 'Select default model',
      choices: models,
      default: section.default_model,
    },
    ...AGENT_NAMES.map(name => ({
      type: 'list' as const,
      name,
      message: `Select model for ${name}`,
      choices: models,
      default: section.agents.find(a => a.name === name)?.model || models[0],
    })),
  ]);

  return {
    provider: section.provider,
    default_model: answers.default_model,
    agents: AGENT_NAMES.map(name => {
      const agent = section.agents.find(a => a.name === name);
      return {
        template: name,
        name,
        model: answers[name] || agent?.model || models[0],
      };
    }),
  };
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
      choices: models,
      default: section.build_model,
    },
    {
      type: 'list',
      name: 'plan_model',
      message: 'Select model for plan',
      choices: models,
      default: section.plan_model,
    },
    ...AGENT_NAMES.map(name => ({
      type: 'list' as const,
      name,
      message: `Select model for ${name}`,
      choices: models,
      default: section.agents.find(a => a.name === name)?.model || models[0],
    })),
  ]);

  return {
    provider,
    build_model: answers.build_model,
    plan_model: answers.plan_model,
    agents: AGENT_NAMES.map(name => {
      const agent = section.agents.find(a => a.name === name);
      return {
        template: name,
        name,
        model: answers[name] || agent?.model || models[0],
      };
    }),
  };
}

export function formatFileList(files: { path: string; exists: boolean }[]): string {
  return files.map(f => `  ${f.exists ? '~' : '+'} ${f.path}`).join('\n');
}

export function guardProvider(provider: Provider | undefined): OpenCodeConfig['provider'] {
  if (!provider || !['opencode-zen', 'opencode-go', 'amazon-bedrock', 'openai'].includes(provider)) {
    throw new InvalidConfigError('A valid provider must be selected for OpenCode');
  }
  return provider as OpenCodeConfig['provider'];
}
