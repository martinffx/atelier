import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { readConfig, writeConfig, CONFIG_FILE } from '../utils/config.js';
import { generateClaude } from '../generators/claude.js';
import { generateOpenCode, GLOBAL_OPENCODE_DIR } from '../generators/opencode.js';
import { getModelsForProvider } from '../utils/templates.js';
import { ConfigNotFoundError } from '../utils/errors.js';
import inquirer from 'inquirer';
import type { AtelierConfig, Provider } from '../types.js';

export async function update(options?: { harness?: string; basePath?: string }): Promise<void> {
  const { basePath } = options ?? {};
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
  const agentNames = ['recon', 'oracle', 'architect'] as const;

  const promptDefs: { type: 'list'; name: string; message: string; choices: readonly string[]; default: string }[] = [];

  if (config.harness === 'opencode') {
    const buildCurrent = config.build_model || harnessModels[0];
    const planCurrent = config.plan_model || harnessModels[0];
    promptDefs.push(
      {
        type: 'list' as const,
        name: 'build_model',
        message: `Select model for build (current: ${buildCurrent})`,
        choices: harnessModels,
        default: buildCurrent && harnessModels.includes(buildCurrent) ? buildCurrent : harnessModels[0],
      },
      {
        type: 'list' as const,
        name: 'plan_model',
        message: `Select model for plan (current: ${planCurrent})`,
        choices: harnessModels,
        default: planCurrent && harnessModels.includes(planCurrent) ? planCurrent : harnessModels[0],
      }
    );
  } else {
    const currentDefault = config.default_model || 'opusplan';
    promptDefs.push({
      type: 'list' as const,
      name: 'default_model',
      message: `Select default model (current: ${currentDefault})`,
      choices: harnessModels,
      default: currentDefault,
    });
  }

  for (const name of agentNames) {
    const agent = config!.agents.find(a => a.name === name);
    const currentModel = agent?.model;
    const defaultModel = currentModel && harnessModels.includes(currentModel)
      ? currentModel
      : harnessModels[0];
    promptDefs.push({
      type: 'list' as const,
      name,
      message: `Select model for ${name} (current: ${defaultModel})`,
      choices: harnessModels,
      default: defaultModel,
    });
  }

  const answers: Record<string, string> = {};
  let i = 0;
  while (i < promptDefs.length) {
    const p = promptDefs[i];
    const choices = i > 0 ? [...p.choices, '← Go back'] : p.choices;
    const result = await inquirer.prompt([{ type: p.type, name: p.name, message: p.message, choices, default: p.default }]);
    if (result[p.name] === '← Go back') {
      i--;
      continue;
    }
    answers[p.name] = result[p.name] as string;
    i++;
  }

  for (const name of agentNames) {
    const agent = config.agents.find(a => a.name === name);
    if (agent) {
      agent.model = answers[name];
    }
  }

  if (config.harness === 'opencode') {
    if (answers.build_model) config.build_model = answers.build_model;
    if (answers.plan_model) config.plan_model = answers.plan_model;
  } else {
    if (answers.default_model) config.default_model = answers.default_model;
  }

  // Save updated config
  writeConfig(config, join(configBasePath, CONFIG_FILE));

  const files = buildFileList(config, harnessBasePath);
  console.log('\nFiles to write:');
  for (const f of files) {
    const label = f.exists ? '~' : '+';
    console.log(`  ${label} ${shortPath(f.path)}`);
  }
  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: 'Write these files?',
    default: true,
  }]);
  if (!confirm) {
    console.log('Cancelled.');
    return;
  }

  if (config.harness === 'claude') {
    generateClaude(config, harnessBasePath);
  } else {
    generateOpenCode(config, harnessBasePath);
  }

  console.log('Atelier updated (agents, hooks, and commands).');
  console.log('Skills are managed separately. Run `npx skills update martinffx/atelier` to update skills.');
}

function buildFileList(config: AtelierConfig, basePath: string): { path: string; exists: boolean }[] {
  const files: { path: string; exists: boolean }[] = [];

  if (config.harness === 'claude') {
    files.push(
      { path: join(basePath, '.claude/settings.json'), exists: existsSync(join(basePath, '.claude/settings.json')) },
      { path: join(basePath, 'hooks/atelier-session-start'), exists: existsSync(join(basePath, 'hooks/atelier-session-start')) },
    );
    for (const agent of config.agents) {
      files.push({ path: join(basePath, '.claude/agents', `${agent.name}.md`), exists: existsSync(join(basePath, '.claude/agents', `${agent.name}.md`)) });
    }
  } else {
    const root = basePath === GLOBAL_OPENCODE_DIR ? basePath : join(basePath, '.opencode');
    files.push(
      { path: join(basePath, 'opencode.json'), exists: existsSync(join(basePath, 'opencode.json')) },
      { path: join(root, 'plugins/atelier.js'), exists: existsSync(join(root, 'plugins/atelier.js')) },
    );
    for (const agent of config.agents) {
      files.push({ path: join(root, 'agent', `${agent.name}.md`), exists: existsSync(join(root, 'agent', `${agent.name}.md`)) });
    }
  }

  return files;
}

function shortPath(p: string): string {
  const home = homedir();
  if (p.startsWith(home)) return '~' + p.slice(home.length);
  return p;
}
