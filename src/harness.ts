import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import inquirer from 'inquirer';
import type {
  Harness,
  AtelierConfig,
  Provider,
  SimpleConfig,
  OpenCodeConfig,
  OpenCodeProvider,
  HarnessSection,
  SharedConfig,
  FileEntry,
} from './types.js';
import type { OpenCodeGeneratorConfig } from './generators/opencode.js';
import { AGENT_NAMES, HARNESS_CHOICES } from './types.js';
import { defaultModels } from './models.js';
import { getModelsForProvider } from './utils/templates.js';
import { generateClaude, removeClaudeArtifacts } from './generators/claude.js';
import { generateOpenCode, removeOpenCodeArtifacts, getGlobalOpencodeDir, getOpencodeRoot } from './generators/opencode.js';
import { generateCodex, removeCodexArtifacts } from './generators/codex.js';
import { InvalidConfigError, InvalidHarnessError } from './utils/errors.js';

export { HARNESS_CHOICES };

export const providerChoices: { name: string; value: OpenCodeProvider }[] = [
  { name: 'OpenCode Zen', value: 'opencode-zen' },
  { name: 'OpenCode Go', value: 'opencode-go' },
  { name: 'Amazon Bedrock', value: 'amazon-bedrock' },
];

export function isHarness(value: string): value is Harness {
  return value === 'claude' || value === 'opencode' || value === 'codex';
}

export function parseHarness(value: string): Harness {
  if (!isHarness(value)) {
    throw new InvalidHarnessError(value);
  }
  return value;
}

export function getConfiguredHarnesses(config: AtelierConfig): Harness[] {
  return HARNESS_CHOICES.filter(harness => config[harness] !== undefined);
}

export function getGlobalBasePath(harness: Harness): string {
  return harness === 'opencode' ? getGlobalOpencodeDir() : homedir();
}

interface HarnessMeta {
  getBasePath: () => string;
  promptForModels: (section: HarnessSection) => Promise<HarnessSection>;
  generateFiles: (shared: SharedConfig, section: HarnessSection, basePath: string) => void;
  buildFileList: (basePath: string) => FileEntry[];
  removeArtifacts: (config: SimpleConfig | OpenCodeGeneratorConfig, basePath: string) => void;
}

function isOpenCodeSection(section: HarnessSection): section is OpenCodeConfig {
  return 'provider' in section;
}

function assertSimpleSection(section: HarnessSection): SimpleConfig {
  if (isOpenCodeSection(section)) {
    throw new InvalidConfigError('Expected simple config section');
  }
  return section;
}

function assertOpenCodeSection(section: HarnessSection): OpenCodeConfig {
  if (!isOpenCodeSection(section)) {
    throw new InvalidConfigError('Expected opencode section');
  }
  return section;
}

export const harnessRegistry: Record<Harness, HarnessMeta> = {
  claude: {
    getBasePath: () => homedir(),
    promptForModels: (section) => promptForSimpleModels(assertSimpleSection(section), 'anthropic'),
    generateFiles: (shared, section, basePath) => generateClaude({ ...shared, ...assertSimpleSection(section) }, basePath),
    buildFileList: (basePath) => buildClaudeFileList(basePath),
    removeArtifacts: (config, basePath) => removeClaudeArtifacts(config as SimpleConfig, basePath),
  },
  codex: {
    getBasePath: () => homedir(),
    promptForModels: (section) => promptForSimpleModels(assertSimpleSection(section), 'openai'),
    generateFiles: (shared, section, basePath) => generateCodex({ ...shared, ...assertSimpleSection(section) }, basePath),
    buildFileList: (basePath) => buildCodexFileList(basePath),
    removeArtifacts: (config, basePath) => removeCodexArtifacts(config as SimpleConfig, basePath),
  },
  opencode: {
    getBasePath: () => getGlobalOpencodeDir(),
    promptForModels: (section) => promptForOpenCodeModels(assertOpenCodeSection(section)),
    generateFiles: (shared, section, basePath) => generateOpenCode({ ...shared, ...assertOpenCodeSection(section) }, basePath),
    buildFileList: (basePath) => buildOpenCodeFileList(basePath),
    removeArtifacts: (config, basePath) => removeOpenCodeArtifacts(config as OpenCodeGeneratorConfig, basePath),
  },
};

export async function promptForModels(section: HarnessSection, harness: Harness): Promise<HarnessSection> {
  const meta = harnessRegistry[harness];
  if (!meta) {
    throw new InvalidConfigError(`Unknown harness: ${harness}`);
  }
  return meta.promptForModels(section);
}

async function promptForSimpleModels(section: SimpleConfig, provider: Provider): Promise<SimpleConfig> {
  const models = getModelsForProvider(provider);

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

async function promptForOpenCodeModels(section: OpenCodeConfig): Promise<OpenCodeConfig> {
  const { provider } = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Which provider are you using?',
      choices: providerChoices,
      default: section.provider,
    },
  ]);

  const selectedProvider = provider as OpenCodeProvider;
  const defaults = defaultModels[selectedProvider];
  const models = getModelsForProvider(selectedProvider);

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'build_model',
      message: 'Select model for build',
      choices: models,
      default: section.build_model || defaults.build,
    },
    {
      type: 'list',
      name: 'plan_model',
      message: 'Select model for plan',
      choices: models,
      default: section.plan_model || defaults.plan,
    },
    ...AGENT_NAMES.map(name => ({
      type: 'list' as const,
      name,
      message: `Select model for ${name}`,
      choices: models,
      default: section.agents.find(a => a.name === name)?.model || defaults[name],
    })),
  ]);

  return {
    provider: selectedProvider,
    build_model: answers.build_model,
    plan_model: answers.plan_model,
    agents: AGENT_NAMES.map(name => {
      const agent = section.agents.find(a => a.name === name);
      return {
        template: name,
        name,
        model: answers[name] || agent?.model || defaults[name],
      };
    }),
  };
}

export function generateFiles(shared: SharedConfig, section: HarnessSection, harness: Harness, basePath: string): void {
  const meta = harnessRegistry[harness];
  if (!meta) {
    throw new InvalidConfigError(`Unknown harness: ${harness}`);
  }
  meta.generateFiles(shared, section, basePath);
}

export function buildFileList(harness: Harness, basePath: string): FileEntry[] {
  const meta = harnessRegistry[harness];
  if (!meta) {
    throw new InvalidConfigError(`Unknown harness: ${harness}`);
  }
  return meta.buildFileList(basePath);
}

export function removeArtifacts(shared: SharedConfig, section: HarnessSection, harness: Harness, basePath: string): void {
  const meta = harnessRegistry[harness];
  if (!meta) {
    throw new InvalidConfigError(`Unknown harness: ${harness}`);
  }
  const config = isOpenCodeSection(section) ? { ...shared, ...section } : section;
  meta.removeArtifacts(config, basePath);
}

function buildClaudeFileList(basePath: string): FileEntry[] {
  const files: FileEntry[] = [
    { path: join(basePath, '.claude/settings.json'), exists: existsSync(join(basePath, '.claude/settings.json')) },
    { path: join(basePath, 'hooks/atelier-session-start'), exists: existsSync(join(basePath, 'hooks/atelier-session-start')) },
  ];
  for (const name of AGENT_NAMES) {
    files.push({ path: join(basePath, '.claude/agents', `${name}.md`), exists: existsSync(join(basePath, '.claude/agents', `${name}.md`)) });
  }
  return files;
}

function buildOpenCodeFileList(basePath: string): FileEntry[] {
  const root = getOpencodeRoot(basePath);
  const files: FileEntry[] = [
    { path: join(basePath, 'opencode.json'), exists: existsSync(join(basePath, 'opencode.json')) },
    { path: join(root, 'plugins/atelier.js'), exists: existsSync(join(root, 'plugins/atelier.js')) },
  ];
  for (const name of AGENT_NAMES) {
    files.push({ path: join(root, 'agent', `${name}.md`), exists: existsSync(join(root, 'agent', `${name}.md`)) });
  }
  return files;
}

function buildCodexFileList(basePath: string): FileEntry[] {
  const files: FileEntry[] = [
    { path: join(basePath, '.codex/config.toml'), exists: existsSync(join(basePath, '.codex/config.toml')) },
  ];
  for (const name of AGENT_NAMES) {
    files.push({ path: join(basePath, '.codex/agents', `${name}.toml`), exists: existsSync(join(basePath, '.codex/agents', `${name}.toml`)) });
  }
  return files;
}

export function shortPath(p: string): string {
  const home = homedir();
  if (p === home || p.startsWith(home + '/')) {
    return '~' + p.slice(home.length);
  }
  return p;
}
