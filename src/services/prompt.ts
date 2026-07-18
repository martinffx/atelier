import inquirer from 'inquirer';
import type { HarnessAdapter, HarnessSection, SimpleConfig, OpenCodeConfig, Provider, AgentName } from '../types.js';
import { AGENT_NAMES } from '../types.js';

function isOpenCodeSection(section: HarnessSection): section is OpenCodeConfig {
  return 'build_model' in section;
}

export async function promptForSection(adapter: HarnessAdapter, section: HarnessSection): Promise<HarnessSection> {
  let provider: Provider | undefined;

  if (adapter.providerChoices && adapter.providerChoices.length > 0) {
    const currentProvider = isOpenCodeSection(section) ? section.provider : undefined;
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Which provider are you using?',
        choices: adapter.providerChoices,
        default: currentProvider,
      },
    ]);
    provider = answer.provider as Provider;
  }

  const models = adapter.modelsForProvider(provider);
  if (models.length === 0) {
    throw new Error(`No models available for ${adapter.name}${provider ? ` / ${provider}` : ''}`);
  }

  if (isOpenCodeSection(section)) {
    return promptForOpenCodeModels(section, models, provider as OpenCodeConfig['provider']);
  }

  return promptForSimpleModels(section, models);
}

async function promptForSimpleModels(section: SimpleConfig, models: readonly string[]): Promise<SimpleConfig> {
  const answers = await inquirer.prompt([
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

async function promptForOpenCodeModels(section: OpenCodeConfig, models: readonly string[], provider: OpenCodeConfig['provider']): Promise<OpenCodeConfig> {
  const answers = await inquirer.prompt([
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
