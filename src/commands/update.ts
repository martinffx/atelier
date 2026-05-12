import { join } from 'path';
import { homedir } from 'os';
import { readConfig, writeConfig, CONFIG_FILE } from '../utils/config.js';
import { generateClaude } from '../generators/claude.js';
import { generateOpenCode, GLOBAL_OPENCODE_DIR } from '../generators/opencode.js';
import { getModelsForProvider } from '../utils/templates.js';
import { ConfigNotFoundError } from '../utils/errors.js';
import inquirer from 'inquirer';
import type { AtelierConfig, Provider } from '../types.js';

export async function update(basePath?: string): Promise<void> {
  const resolvedBasePath = basePath ?? process.cwd();
  let config = readConfig(join(resolvedBasePath, CONFIG_FILE));
  let harnessBasePath = resolvedBasePath;
  let configBasePath = resolvedBasePath;

  // Only fall back to global config when called without an explicit path
  if (!config && basePath === undefined) {
    configBasePath = homedir();
    config = readConfig(join(configBasePath, CONFIG_FILE));
    if (config) {
      harnessBasePath = config.harness === 'opencode'
        ? GLOBAL_OPENCODE_DIR
        : homedir();
    }
  }

  if (!config) {
    throw new ConfigNotFoundError('update');
  }

  // Prompt for model selection
  const provider: Provider = config.harness === 'opencode'
    ? (config.provider || 'opencode-zen')
    : 'anthropic';
  const harnessModels = getModelsForProvider(provider);
  const agentNames = ['scout', 'oracle', 'architect'] as const;

  const prompts = agentNames.map((name) => {
    const agent = config!.agents.find(a => a.name === name);
    const currentModel = agent?.model;
    const defaultModel = currentModel && harnessModels.includes(currentModel)
      ? currentModel
      : harnessModels[0];
    return {
      type: 'list' as const,
      name,
      message: `Select model for ${name} (current: ${defaultModel})`,
      choices: harnessModels,
      default: defaultModel,
    };
  });

  const answers = await inquirer.prompt(prompts);

  for (const name of agentNames) {
    const agent = config.agents.find(a => a.name === name);
    if (agent) {
      agent.model = answers[name];
    }
  }

  // Save updated config
  writeConfig(config, join(configBasePath, CONFIG_FILE));

  if (config.harness === 'claude') {
    generateClaude(config, harnessBasePath);
  } else {
    generateOpenCode(config, harnessBasePath);
  }

  console.log('Atelier updated.');
  console.log('Skills not updated. Run `npx skills update martinffx/atelier` if needed.');
}
