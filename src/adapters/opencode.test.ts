import { describe, it, expect, beforeEach } from 'bun:test';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, rmSync, symlinkSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { opencodeAdapter, getOpencodeRoot } from './opencode.js';
import { getGlobalOpencodeDir } from '../services/paths.js';

const section = (provider?: Parameters<typeof opencodeAdapter.defaultSection>[0]) => opencodeAdapter.defaultSection(provider);

function installSkill(skillsPath: string, name: string, frontmatter: string): void {
  const skillDir = join(skillsPath, name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, 'SKILL.md'), `---\n${frontmatter}\n---\n# ${name}\n`);
}

function sharedConfig(skillsPath: string) {
  return { version: '0.1.0', skills_source: 'martinffx/atelier', skills_path: skillsPath };
}

describe('opencode adapter', () => {
  let basePath: string;

  beforeEach(() => {
    basePath = mkdtempSync(join(tmpdir(), 'atelier-opencode-'));
  });

  it('defaultSection returns provider defaults', () => {
    const section = opencodeAdapter.defaultSection('amazon-bedrock');
    expect(section.provider).toBe('amazon-bedrock');
    expect(section.default_model).toBe('amazon-bedrock/us.anthropic.claude-opus-5-5');
  });

  it('modelsForProvider returns provider-scoped models', () => {
    const models = opencodeAdapter.modelsForProvider('opencode-go');
    expect(models.every(m => m.startsWith('opencode-go/'))).toBe(true);
  });

  it('exposes direct OpenAI models and defaults', () => {
    const openAiSection = opencodeAdapter.defaultSection('openai');
    const models = opencodeAdapter.modelsForProvider('openai');

    expect(openAiSection.provider).toBe('openai');
    expect(openAiSection.default_model).toBe('openai/gpt-6-astra');
    expect(openAiSection.agents).toEqual([
      { template: 'sentinel', name: 'sentinel', model: 'openai/gpt-6-luna', thinking: 'low' },
      { template: 'oracle', name: 'oracle', model: 'openai/gpt-6-astra', thinking: 'xhigh' },
      { template: 'architect', name: 'architect', model: 'openai/gpt-6-astra', thinking: 'high' },
      { template: 'keymaker', name: 'keymaker', model: 'openai/gpt-6-sol', thinking: 'medium' },
    ]);
    expect(models.every(model => model.startsWith('openai/'))).toBe(true);
  });

  describe('openrouter warming', () => {
    const jsonPath = () => join(basePath, 'opencode.json');
    const read = () => JSON.parse(readFileSync(jsonPath(), 'utf-8'));
    const seed = (value: unknown) => writeFileSync(jsonPath(), JSON.stringify(value));
    const warm = { providers: { openrouter: { settings: { cache: { warming: true } } } } };
    const orSection = (warming?: boolean) => ({ ...section('openrouter'), ...(warming === undefined ? {} : { warming }) });

    it('writes the key when enabled', () => {
      opencodeAdapter.mergeHarnessConfig(orSection(true), basePath);
      expect(read().providers).toEqual(warm.providers);
    });

    it('omits the key when disabled', () => {
      opencodeAdapter.mergeHarnessConfig(orSection(false), basePath);
      expect(read().providers).toBeUndefined();
    });

    it('turning it off removes the key and prunes empty parents', () => {
      seed(warm);
      opencodeAdapter.mergeHarnessConfig(orSection(false), basePath);
      expect(read().providers).toBeUndefined();
    });

    it('keeps unrelated providers entries when turning it off', () => {
      seed({ providers: { openrouter: { settings: { cache: { warming: true, other: 1 } }, keep: 2 }, other: { x: 1 } } });
      opencodeAdapter.mergeHarnessConfig(orSection(false), basePath);
      expect(read().providers).toEqual({ openrouter: { settings: { cache: { other: 1 } }, keep: 2 }, other: { x: 1 } });
    });

    it('keeps a custom object value', () => {
      const custom = { providers: { openrouter: { settings: { cache: { warming: { interval: 60 } } } } } };
      seed(custom);
      opencodeAdapter.mergeHarnessConfig(orSection(false), basePath);
      expect(read().providers).toEqual(custom.providers);
    });

    it('keeps a custom object value when warming is enabled', () => {
      const custom = { providers: { openrouter: { settings: { cache: { warming: { interval: 60 } } } } } };
      seed(custom);
      opencodeAdapter.mergeHarnessConfig(orSection(true), basePath);
      expect(read().providers).toEqual(custom.providers);
    });

    describe('with a legacy provider.openrouter block', () => {
      const legacy = { openrouter: { models: { custom: { name: 'Custom' } }, options: { order: ['x'] } } };

      it('does not write the key and prints a skip line', () => {
        seed({ provider: legacy });
        const logs: string[] = [];
        const orig = console.log;
        console.log = (...args: unknown[]) => { logs.push(args.join(' ')); };
        try {
          opencodeAdapter.mergeHarnessConfig(orSection(true), basePath);
        } finally {
          console.log = orig;
        }
        expect(read().providers).toBeUndefined();
        expect(read().provider).toEqual(legacy);
        expect(logs.some(l => l.startsWith('Skipped providers.openrouter.settings.cache.warming in ') && l.includes('provider.openrouter'))).toBe(true);
      });

      it('clears an exact true and prunes empty parents', () => {
        seed({ ...warm, provider: legacy });
        opencodeAdapter.mergeHarnessConfig(orSection(true), basePath);
        expect(read().providers).toBeUndefined();
        expect(read().provider).toEqual(legacy);
      });

      it('leaves a custom warming object untouched', () => {
        const custom = { providers: { openrouter: { settings: { cache: { warming: { interval: 60 } } } } } };
        seed({ ...custom, provider: legacy });
        opencodeAdapter.mergeHarnessConfig(orSection(true), basePath);
        expect(read().providers).toEqual(custom.providers);
      });

      it('writes the key once the conflict is removed', () => {
        seed({ provider: legacy });
        opencodeAdapter.mergeHarnessConfig(orSection(true), basePath);
        expect(read().providers).toBeUndefined();
        const file = read();
        delete file.provider;
        seed(file);
        opencodeAdapter.mergeHarnessConfig(orSection(true), basePath);
        expect(read().providers).toEqual(warm.providers);
      });

      it('tolerates a non-object provider value', () => {
        seed({ provider: 'x' });
        opencodeAdapter.mergeHarnessConfig(orSection(true), basePath);
        expect(read().providers).toEqual(warm.providers);
      });
    });

    it('clears it when switching away from OpenRouter', () => {
      seed(warm);
      opencodeAdapter.mergeHarnessConfig({ ...section('opencode-go'), warming: true }, basePath);
      expect(read().providers).toBeUndefined();
    });

    it('remove clears it', () => {
      seed({ ...warm, model: orSection(true).default_model });
      opencodeAdapter.remove(orSection(true), basePath);
      expect(existsSync(jsonPath())).toBe(false);
    });

    it('never writes it for non-OpenRouter providers', () => {
      opencodeAdapter.mergeHarnessConfig({ ...section('openai'), warming: true }, basePath);
      expect(read().providers).toBeUndefined();
    });

    it('leaves an existing value untouched when undefined on OpenRouter', () => {
      seed(warm);
      opencodeAdapter.mergeHarnessConfig(orSection(), basePath);
      expect(read().providers).toEqual(warm.providers);
    });

    it('tolerates non-object values along the path', () => {
      seed({ providers: { openrouter: 'x' } });
      opencodeAdapter.mergeHarnessConfig(orSection(false), basePath);
      expect(read().providers).toEqual({ openrouter: 'x' });
    });
  });

  it('mergeHarnessConfig writes opencode.json', () => {
    opencodeAdapter.mergeHarnessConfig(section(), basePath);
    const path = join(basePath, 'opencode.json');
    expect(existsSync(path)).toBe(true);
    const content = JSON.parse(readFileSync(path, 'utf-8'));
    expect(content.agent.build.mode).toBe('primary');
    expect(content.agent.build.model).toBe(section().default_model);
    expect(content.agent.plan.mode).toBe('primary');
    expect(content.agent.plan.model).toBe(section().default_model);
    expect(content.model).toBe(section().default_model);
  });

  it('mergeHarnessConfig replaces a user top-level model so every agent shares the session model', () => {
    mkdirSync(basePath, { recursive: true });
    writeFileSync(join(basePath, 'opencode.json'), JSON.stringify({
      model: 'opencode-go/deepseek-v4.1-flash',
      permission: { bash: { '*': 'ask' } },
    }, null, 2));
    opencodeAdapter.mergeHarnessConfig(section(), basePath);
    const content = JSON.parse(readFileSync(join(basePath, 'opencode.json'), 'utf-8'));
    expect(content.model).toBe(section().default_model);
    expect(content.agent.build.model).toBe(section().default_model);
    expect(content.permission).toEqual({ bash: { '*': 'ask' } });
  });

  it('remove clears the top-level model only while it still matches the session model', () => {
    mkdirSync(basePath, { recursive: true });
    const s = section();
    opencodeAdapter.mergeHarnessConfig(s, basePath);
    opencodeAdapter.remove(s, basePath);
    expect(existsSync(join(basePath, 'opencode.json'))).toBe(false);

    writeFileSync(join(basePath, 'opencode.json'), JSON.stringify({ model: 'openai/gpt-6-sol' }, null, 2));
    opencodeAdapter.remove(s, basePath);
    const content = JSON.parse(readFileSync(join(basePath, 'opencode.json'), 'utf-8'));
    expect(content.model).toBe('openai/gpt-6-sol');
  });

  it('mergeHarnessConfig rewrites an Atelier agent.plan with the session model, clearing stale thinking and keeping user keys', () => {
    mkdirSync(basePath, { recursive: true });
    writeFileSync(join(basePath, 'opencode.json'), JSON.stringify({
      agent: {
        plan: { mode: 'primary', model: 'opencode/glm-5.3', temperature: 0.2, thinking: { type: 'enabled' } },
      },
    }, null, 2));
    opencodeAdapter.mergeHarnessConfig(section(), basePath);
    const content = JSON.parse(readFileSync(join(basePath, 'opencode.json'), 'utf-8'));
    expect(content.agent.plan).toEqual({ mode: 'primary', model: section().default_model, temperature: 0.2, reasoningEffort: 'high' });
    expect(content.agent.build.model).toBe(section().default_model);
  });

  it('mergeHarnessConfig strips a stale Atelier agent.plan when plan_thinking is unset', () => {
    mkdirSync(basePath, { recursive: true });
    writeFileSync(join(basePath, 'opencode.json'), JSON.stringify({
      agent: { plan: { mode: 'primary', model: 'opencode/glm-5.3', temperature: 0.2 } },
    }, null, 2));
    const { plan_thinking: _omitted, ...withoutPlan } = section();
    opencodeAdapter.mergeHarnessConfig(withoutPlan, basePath);
    const content = JSON.parse(readFileSync(join(basePath, 'opencode.json'), 'utf-8'));
    expect(content.agent.plan).toEqual({ temperature: 0.2 });
  });

  it('leaves a user-owned agent.plan without mode primary intact through merge and remove', () => {
    mkdirSync(basePath, { recursive: true });
    const userPlan = { model: 'openai/gpt-6-sol', temperature: 0.2 };
    writeFileSync(join(basePath, 'opencode.json'), JSON.stringify({ agent: { plan: userPlan } }, null, 2));
    const s = section();

    opencodeAdapter.mergeHarnessConfig(s, basePath);
    let content = JSON.parse(readFileSync(join(basePath, 'opencode.json'), 'utf-8'));
    expect(content.agent.plan).toEqual(userPlan);

    opencodeAdapter.remove(s, basePath);
    content = JSON.parse(readFileSync(join(basePath, 'opencode.json'), 'utf-8'));
    expect(content.agent.plan).toEqual(userPlan);
    expect(content.agent.build).toBeUndefined();
  });

  it('prints a skip line when plan_thinking is set but agent.plan is user-owned', () => {
    mkdirSync(basePath, { recursive: true });
    writeFileSync(join(basePath, 'opencode.json'), JSON.stringify({ agent: { plan: { model: 'openai/gpt-6-sol' } } }, null, 2));
    const logs: string[] = [];
    const original = console.log;
    console.log = (...args: unknown[]) => { logs.push(args.join(' ')); };
    try {
      opencodeAdapter.mergeHarnessConfig(section(), basePath);
    } finally {
      console.log = original;
    }
    expect(logs.some(line => line.startsWith('Skipped') && line.includes('agent.plan') && line.includes('not managed by Atelier'))).toBe(true);
  });

  it('remove clears the agent.plan that merge wrote', () => {
    mkdirSync(basePath, { recursive: true });
    const s = section();
    opencodeAdapter.mergeHarnessConfig(s, basePath);
    expect(JSON.parse(readFileSync(join(basePath, 'opencode.json'), 'utf-8')).agent.plan).toBeDefined();
    opencodeAdapter.remove(s, basePath);
    expect(existsSync(join(basePath, 'opencode.json'))).toBe(false);
  });

  it('mergeHarnessConfig preserves user settings', () => {
    mkdirSync(basePath, { recursive: true });
    writeFileSync(join(basePath, 'opencode.json'), JSON.stringify({ custom: 'value' }, null, 2));
    opencodeAdapter.mergeHarnessConfig(section(), basePath);
    const content = JSON.parse(readFileSync(join(basePath, 'opencode.json'), 'utf-8'));
    expect(content.custom).toBe('value');
    expect(content.agent.build.mode).toBe('primary');
  });

  it('mergeHarnessConfig throws on malformed opencode.json', () => {
    mkdirSync(basePath, { recursive: true });
    writeFileSync(join(basePath, 'opencode.json'), 'not valid json');

    expect(() => opencodeAdapter.mergeHarnessConfig(section(), basePath)).toThrow();
  });

  it('installAgents writes agent files', () => {
    opencodeAdapter.installAgents(section(), basePath);
    const agentsDir = join(getOpencodeRoot(basePath), 'agent');
    for (const name of ['sentinel', 'oracle', 'architect', 'keymaker']) {
      const path = join(agentsDir, `${name}.md`);
      expect(existsSync(path)).toBe(true);
      const content = readFileSync(path, 'utf-8');
      expect(content).toContain(`name: ${name}`);
      expect(content).toContain('mode: subagent');
    }
  });

  it('creates commands for every installed user-invocable skill', () => {
    const skillsPath = join(basePath, 'skills');
    installSkill(skillsPath, 'atelier-command', 'name: atelier-command\ndescription: Atelier command\nuser-invocable: true');
    installSkill(skillsPath, 'third-party-command', 'name: third-party-command\ndescription: Third-party command\nuser-invocable: true');
    installSkill(skillsPath, 'automatic-skill', 'name: automatic-skill\ndescription: Automatic skill\nuser-invocable: false');
    installSkill(skillsPath, 'malformed-skill', 'name: malformed-skill\nuser-invocable: true');

    opencodeAdapter.installAgents(section(), basePath, sharedConfig(skillsPath));

    const commandsDir = join(getOpencodeRoot(basePath), 'command');
    const command = readFileSync(join(commandsDir, 'third-party-command.md'), 'utf-8');
    expect(existsSync(join(commandsDir, 'atelier-command.md'))).toBe(true);
    expect(command).toContain('<!-- Generated by Atelier -->');
    expect(command).toContain('Activate the third-party-command skill');
    expect(command).toContain('User request: $ARGUMENTS');
    expect(existsSync(join(commandsDir, 'automatic-skill.md'))).toBe(false);
    expect(existsSync(join(commandsDir, 'malformed-skill.md'))).toBe(false);
    expect(opencodeAdapter.fileList(basePath, sharedConfig(skillsPath)).map(file => file.path)).toContain(
      join(commandsDir, 'third-party-command.md')
    );
  });

  it('fileList reports managed files', () => {
    opencodeAdapter.mergeHarnessConfig(section(), basePath);
    opencodeAdapter.installAgents(section(), basePath);
    const files = opencodeAdapter.fileList(basePath);
    expect(files.map(f => f.path)).toEqual([
      join(basePath, 'opencode.json'),
      join(getOpencodeRoot(basePath), 'agent', 'sentinel.md'),
      join(getOpencodeRoot(basePath), 'agent', 'oracle.md'),
      join(getOpencodeRoot(basePath), 'agent', 'architect.md'),
      join(getOpencodeRoot(basePath), 'agent', 'keymaker.md'),
    ]);
  });

  it('fileList includes only commands that Atelier can write', () => {
    const skillsPath = join(basePath, 'skills');
    installSkill(skillsPath, 'managed-skill', 'name: managed-skill\ndescription: Managed skill\nuser-invocable: true');
    const commandsDir = join(getOpencodeRoot(basePath), 'command');
    mkdirSync(commandsDir, { recursive: true });
    writeFileSync(join(commandsDir, 'managed-skill.md'), '# custom command');

    const files = opencodeAdapter.fileList(basePath, sharedConfig(skillsPath));

    expect(files.map(file => file.path)).not.toContain(join(commandsDir, 'managed-skill.md'));
  });

  it('lists stale managed commands for deletion', () => {
    const skillsPath = join(basePath, 'skills');
    installSkill(skillsPath, 'managed-skill', 'name: managed-skill\ndescription: Managed skill\nuser-invocable: true');
    opencodeAdapter.installAgents(section(), basePath, sharedConfig(skillsPath));
    rmSync(join(skillsPath, 'managed-skill'), { recursive: true });

    const files = opencodeAdapter.fileList(basePath, sharedConfig(skillsPath));

    expect(files).toContainEqual({
      path: join(getOpencodeRoot(basePath), 'command', 'managed-skill.md'),
      exists: true,
      action: 'delete',
    });
  });

  it('remove deletes agent files and strips opencode.json', () => {
    const s = section();
    opencodeAdapter.mergeHarnessConfig(s, basePath);
    opencodeAdapter.installAgents(s, basePath);

    // legacy files
    const root = getOpencodeRoot(basePath);
    const pluginPath = join(root, 'plugins', 'atelier.js');
    mkdirSync(dirname(pluginPath), { recursive: true });
    writeFileSync(pluginPath, 'export default {};');

    opencodeAdapter.remove(s, basePath);

    expect(existsSync(join(root, 'agent', 'sentinel.md'))).toBe(false);
    expect(existsSync(join(root, 'agent', 'oracle.md'))).toBe(false);
    expect(existsSync(join(root, 'agent', 'architect.md'))).toBe(false);
    expect(existsSync(join(root, 'agent'))).toBe(false);
    expect(existsSync(pluginPath)).toBe(false);
    expect(existsSync(join(basePath, 'opencode.json'))).toBe(false);
  });

  it('remove preserves custom opencode.json keys', () => {
    const s = section();
    opencodeAdapter.mergeHarnessConfig(s, basePath);
    const path = join(basePath, 'opencode.json');
    const content = JSON.parse(readFileSync(path, 'utf-8'));
    content.custom = 'value';
    content.agent.plan = { mode: 'primary', model: 'opencode/glm-5.3', reasoningEffort: 'high' };
    writeFileSync(path, JSON.stringify(content, null, 2));

    opencodeAdapter.remove(s, basePath);

    expect(existsSync(path)).toBe(true);
    const remaining = JSON.parse(readFileSync(path, 'utf-8'));
    expect(remaining.custom).toBe('value');
    expect(remaining.agent?.build).toBeUndefined();
    expect(remaining.agent?.plan).toBeUndefined();
  });

  it('remove leaves user-created files in the agent directory', () => {
    const s = section();
    opencodeAdapter.mergeHarnessConfig(s, basePath);
    opencodeAdapter.installAgents(s, basePath);

    const agentsDir = join(getOpencodeRoot(basePath), 'agent');
    const userAgent = join(agentsDir, 'user-agent.md');
    writeFileSync(userAgent, '# user agent');

    opencodeAdapter.remove(s, basePath);

    expect(existsSync(userAgent)).toBe(true);
    expect(existsSync(agentsDir)).toBe(true);
    expect(existsSync(join(agentsDir, 'sentinel.md'))).toBe(false);

    rmSync(agentsDir, { recursive: true, force: true });
  });

  it('reconciles managed commands without touching custom commands', () => {
    const skillsPath = join(basePath, 'skills');
    installSkill(skillsPath, 'managed-skill', 'name: managed-skill\ndescription: Managed skill\nuser-invocable: true');
    const s = section();
    const commandsDir = join(getOpencodeRoot(basePath), 'command');
    mkdirSync(commandsDir, { recursive: true });
    writeFileSync(join(commandsDir, 'managed-skill.md'), '<!-- Generated by Atelier -->\n');
    writeFileSync(join(commandsDir, 'custom.md'), '# custom command');

    opencodeAdapter.mergeHarnessConfig(s, basePath);
    opencodeAdapter.installAgents(s, basePath, sharedConfig(skillsPath));
    expect(readFileSync(join(commandsDir, 'managed-skill.md'), 'utf-8')).toContain('<!-- Generated by Atelier -->');

    opencodeAdapter.remove(s, basePath);

    expect(existsSync(join(commandsDir, 'managed-skill.md'))).toBe(false);
    expect(readFileSync(join(commandsDir, 'custom.md'), 'utf-8')).toBe('# custom command');
  });

  it('removes stale managed commands when no invocable skills remain', () => {
    const skillsPath = join(basePath, 'skills');
    installSkill(skillsPath, 'managed-skill', 'name: managed-skill\ndescription: Managed skill\nuser-invocable: true');
    const commandsDir = join(getOpencodeRoot(basePath), 'command');
    opencodeAdapter.installAgents(section(), basePath, sharedConfig(skillsPath));
    rmSync(join(skillsPath, 'managed-skill'), { recursive: true });

    opencodeAdapter.installAgents(section(), basePath, sharedConfig(skillsPath));

    expect(existsSync(join(commandsDir, 'managed-skill.md'))).toBe(false);
  });

  it('preserves unmarked legacy commands', () => {
    const skillsPath = join(basePath, 'skills');
    installSkill(skillsPath, 'managed-skill', 'name: managed-skill\ndescription: Managed skill\nuser-invocable: true');
    const s = section();
    const commandsDir = join(getOpencodeRoot(basePath), 'command');
    const legacy = '---\ndescription: old\n---\nActivate the managed-skill skill and follow its instructions precisely.\n\nUser request: $ARGUMENTS\n';
    mkdirSync(commandsDir, { recursive: true });
    writeFileSync(join(commandsDir, 'managed-skill.md'), legacy);

    opencodeAdapter.mergeHarnessConfig(s, basePath);
    opencodeAdapter.installAgents(s, basePath, sharedConfig(skillsPath));
    opencodeAdapter.remove(s, basePath);

    expect(readFileSync(join(commandsDir, 'managed-skill.md'), 'utf-8')).toBe(legacy);
  });

  it('supports linked skill and command directories but rejects linked command files', () => {
    const skillsPath = join(basePath, 'skills');
    const skillSource = join(basePath, 'skill-source');
    installSkill(skillSource, 'linked-skill', 'name: linked-skill\ndescription: Linked skill\nuser-invocable: true');
    mkdirSync(skillsPath, { recursive: true });
    symlinkSync(join(skillSource, 'linked-skill'), join(skillsPath, 'linked-skill'));

    const root = getOpencodeRoot(basePath);
    const commandTarget = join(basePath, 'command-target');
    mkdirSync(commandTarget, { recursive: true });
    mkdirSync(root, { recursive: true });
    symlinkSync(commandTarget, join(root, 'command'));
    opencodeAdapter.installAgents(section(), basePath, sharedConfig(skillsPath));
    expect(existsSync(join(commandTarget, 'linked-skill.md'))).toBe(true);

    const external = join(basePath, 'external-command.md');
    writeFileSync(external, '# external');
    rmSync(join(commandTarget, 'linked-skill.md'));
    symlinkSync(external, join(commandTarget, 'linked-skill.md'));
    expect(() => opencodeAdapter.installAgents(section(), basePath, sharedConfig(skillsPath))).toThrow('command path must be a regular file');
    expect(readFileSync(external, 'utf-8')).toBe('# external');
  });

  it('getOpencodeRoot returns global dir for global base path', () => {
    expect(getOpencodeRoot(getGlobalOpencodeDir())).toBe(getGlobalOpencodeDir());
  });

  it('getOpencodeRoot returns .opencode subdir for project base path', () => {
    expect(getOpencodeRoot('/tmp/project')).toBe('/tmp/project/.opencode');
  });
});
