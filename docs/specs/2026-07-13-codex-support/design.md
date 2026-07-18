# Codex Harness Support + Multi-Harness Config Refactor

## Problem

Atelier CLI supports `claude` and `opencode` harnesses for agent generation, model configuration, and context injection. Codex (OpenAI's AI coding agent) is not supported. Users on Codex must manually create subagent TOML files and configure models.

Additionally, the current single-harness config model and auto-detection logic do not reflect how users actually work:
- Auto-detection is fragile and often wrong
- The flat config shape (`harness`, `default_model`, `build_model`, `plan_model`) couples unrelated concepts
- There is no way to configure multiple harnesses for the same project

## Scope

**In scope:**
- Add `codex` as a third harness
- Generate `.codex/agents/*.toml` subagent files for recon, oracle, architect
- Generate `.codex/config.toml` with model, reasoning effort, and multi-agent settings
- Codex provider: `openai` only (single provider, no selection prompt)
- Multi-harness config refactor: each harness gets its own config section
- Remove all harness auto-detection; harness is always explicit (`--harness` or interactive picker)
- `--yes` mode now requires `--harness`
- `init` is additive (single harness per run, multiple harnesses can be configured over multiple runs)
- `update` prompts which harness(es) to regenerate (or `--harness` to scope)
- `remove` prompts which harness(es) to remove (or `--harness` to scope)
- Old config format is unsupported; `readConfig` throws a clear error requiring re-init
- Update all existing commands, types, generators, and tests

**Out of scope:**
- Other Codex providers (OpenRouter, Azure, Ollama, etc.) for v1
- Connection config stubs in config.toml
- Skill integration via `skills.config` in agent TOML
- Hook generation for Codex
- Migrating old configs automatically (hard cut, re-init required)

## User Stories

**US-1: Initialize Codex project**
As a developer using Codex, I want to run `atelier init --harness codex` and have it configure models and generate agent files.
- Given I'm in a project directory, when I run `atelier init --harness codex`, then it generates `.codex/config.toml` and `.codex/agents/{recon,oracle,architect}.toml`, and creates `.atelier/config.json`
- Priority: must

**US-2: Multi-harness project**
As a developer working across AI tools, I want to configure both Codex and Claude Code for the same project, each with different models.
- Given atelier is configured for claude, when I run `atelier init --harness codex`, then the config gains a `codex` section alongside the existing `claude` section
- Priority: must

**US-3: Update one harness**
As a developer, I want to regenerate only my Codex files when atelier templates change.
- Given atelier is configured for claude and codex, when I run `atelier update --harness codex`, then only `.codex/` files are regenerated
- Priority: must

**US-4: Remove one harness**
As a developer, I want to remove atelier-generated files for just one harness without touching other harnesses.
- Given atelier is configured for claude and codex, when I run `atelier remove --harness codex`, then only Codex agent files are deleted
- Priority: must

**US-5: Explicit harness selection**
As a developer running in CI, I want clear errors when I forget to specify a harness.
- Given I run `atelier init --yes` without `--harness`, then the CLI exits with a clear error: "`--yes` requires `--harness` (claude, opencode, or codex)"
- Priority: must

## Constraints

- **Agent format**: TOML (not YAML frontmatter markdown like claude/opencode)
- **Config format**: TOML (`.codex/config.toml`), merged with existing if present
- **Model format**: OpenAI short names (`gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, etc.)
- **Single provider for codex**: `openai` — no multi-provider selection like opencode
- **No auto-detection**: Harness must be explicit
- **Built with**: Existing TypeScript + Bun toolchain, same dependencies
- **New dependency**: `smol-toml` for TOML parsing/stringifying
- **Hard config migration**: Old flat config format is unsupported; users must re-init

## Context

### Codex Agent Format

Codex custom subagents are TOML files under `.codex/agents/` (project) or `~/.codex/agents/` (personal). A minimal agent file:

```toml
name = "recon"
description = "Fast codebase reconnaissance and exploration"
model = "gpt-5.6-luna"
model_reasoning_effort = "medium"
sandbox_mode = "read-only"
developer_instructions = """
You are the Recon, a fast reconnaissance agent...
"""
```

Required fields: `name`, `description`, `developer_instructions`.
Optional fields we'll set: `model`, `model_reasoning_effort`, `sandbox_mode`.

### Codex Config Format

Project-level configuration in `.codex/config.toml`:

```toml
model = "gpt-5.6-terra"
model_reasoning_effort = "medium"

[features]
multi_agent = true

[agents]
max_threads = 6
max_depth = 1
```

Atelier merges these keys into any existing config.toml.

### Existing Architecture

```
src/
├── atelier.ts              # CLI entry (commander)
├── types.ts                # Harness/Provider/Config types
├── models.ts               # Provider model registry + defaults
├── commands/
│   ├── init.ts             # Interactive init flow
│   ├── update.ts           # Regenerate from config
│   └── remove.ts           # Clean up generated files
├── generators/
│   ├── claude.ts           # .claude/settings.json + agents + hook
│   └── opencode.ts         # opencode.json + agents + plugin
└── utils/
    ├── config.ts           # Read/write/validate .atelier/config.json
    ├── detect.ts           # Harness auto-detection (TO BE REMOVED)
    ├── templates.ts        # Template reading + model helpers
    └── errors.ts           # Typed error classes
```

### What Changes

| File | Change |
|------|--------|
| `types.ts` | Add `'codex'` to `Harness`; refactor `AtelierConfig` to harness-scoped sections |
| `models.ts` | Add `openai` provider entry; remove backward-compat flat arrays |
| `commands/init.ts` | Remove detection logic; single harness per run; additive multi-harness |
| `commands/update.ts` | Prompt for harness(es) to update; `--harness` to scope |
| `commands/remove.ts` | Prompt for harness(es) to remove; `--harness` to scope |
| `generators/codex.ts` | **New** — generate `.codex/config.toml` + `.codex/agents/*.toml` |
| `generators/codex.test.ts` | **New** — layer boundary tests |
| `utils/config.ts` | Refactor to harness-scoped schema; hard migration error for old format |
| `utils/detect.ts` | **Delete** — no auto-detection |
| `utils/templates.ts` | Add `getDeveloperInstructions()` helper to extract agent body as plain markdown |
| `utils/errors.ts` | Update error messages to mention `--harness` |
| `atelier.ts` | Update command descriptions; `--harness` flag required for `--yes` |
| Tests | Update all existing tests for new config shape and explicit harness behavior |

## Architecture

### Multi-Harness Config Model

```jsonc
{
  "version": "0.1.0",
  "skills_source": "martinffx/atelier",
  "skills_path": "~/.agents/skills",
  "claude": {
    "default_model": "opusplan",
    "agents": [
      { "template": "recon", "name": "recon", "model": "haiku" },
      { "template": "oracle", "name": "oracle", "model": "opus" },
      { "template": "architect", "name": "architect", "model": "opus" }
    ]
  },
  "codex": {
    "default_model": "gpt-5.6-terra",
    "agents": [
      { "template": "recon", "name": "recon", "model": "gpt-5.6-luna" },
      { "template": "oracle", "name": "oracle", "model": "gpt-5.6-sol" },
      { "template": "architect", "name": "architect", "model": "gpt-5.6-sol" }
    ]
  },
  "opencode": {
    "provider": "opencode-zen",
    "build_model": "opencode/deepseek-v4-flash",
    "plan_model": "opencode/deepseek-v4-pro",
    "agents": [
      { "template": "recon", "name": "recon", "model": "opencode/minimax-m2.7" },
      { "template": "oracle", "name": "oracle", "model": "opencode/kimi-k2.6" },
      { "template": "architect", "name": "architect", "model": "opencode/deepseek-v4-pro" }
    ]
  }
}
```

### TypeScript Types

```typescript
export type Harness = 'claude' | 'opencode' | 'codex';
export type Provider = 'anthropic' | 'opencode-zen' | 'opencode-go' | 'amazon-bedrock' | 'openai';

export interface AgentConfig {
  template: string;
  name: string;
  model: string;
}

export interface ClaudeConfig {
  default_model: string;
  agents: AgentConfig[];
}

export interface CodexConfig {
  default_model: string;
  agents: AgentConfig[];
}

export interface OpenCodeConfig {
  provider: Provider;
  build_model: string;
  plan_model: string;
  agents: AgentConfig[];
}

export interface AtelierConfig {
  version: string;
  skills_source: string;
  skills_path: string;
  claude?: ClaudeConfig;
  codex?: CodexConfig;
  opencode?: OpenCodeConfig;
}
```

### Component Flow

```
atelier init --harness codex
├── readConfig()           → load existing multi-harness config
├── getDefaultConfig()     → create codex section with defaults
├── interactive prompts    → default_model + 3 agent models
├── writeConfig()          → save updated config
└── generators/codex.ts
    ├── writeConfigToml()  → .codex/config.toml (merge with existing)
    └── writeAgentFiles()  → .codex/agents/{recon,oracle,architect}.toml
```

### Agent TOML Generation

For each agent, read the existing markdown template, extract description from YAML frontmatter, use body as `developer_instructions`:

```toml
name = "recon"
description = "Fast codebase reconnaissance and exploration..."
model = "gpt-5.6-luna"
model_reasoning_effort = "medium"
sandbox_mode = "read-only"
developer_instructions = """
You are the **Recon**, a fast reconnaissance agent...
"""
```

### Config TOML Generation

```toml
model = "gpt-5.6-terra"
model_reasoning_effort = "medium"

[features]
multi_agent = true

[agents]
max_threads = 6
max_depth = 1
```

Atelier reads any existing `.codex/config.toml` with `smol-toml`, overwrites the keys above, preserves everything else, and writes it back.

### Removal

`atelier remove --harness codex` deletes:
- `.codex/agents/recon.toml`
- `.codex/agents/oracle.toml`
- `.codex/agents/architect.toml`
- The Atelier-managed keys from `.codex/config.toml` (`model`, `model_reasoning_effort`, `features.multi_agent`, `agents.max_threads`, `agents.max_depth`)

It preserves any custom keys in `.codex/config.toml`. If no keys remain, the file is removed. It removes the `codex` section from `.atelier/config.json`. Other harnesses are untouched.

### Update

`atelier update --harness codex` re-reads templates and regenerates the Codex files. Without `--harness`, it prompts the user to select which configured harness(es) to update.

## Commands

### `init` (default)

```
atelier init --harness <claude|opencode|codex> [--all] [--yes] [--project]
```

**Behavior:**
1. If `--harness` is provided, validate it. If `--yes` is set without `--harness`, throw error.
2. If no `--harness`, show interactive picker: `[claude, opencode, codex]` (no default).
3. Read existing `.atelier/config.json`. If old flat format, throw clear error: "Config format has changed. Run `atelier init --harness <harness>` to reconfigure."
4. Add or replace the selected harness section with defaults.
5. Prompt for models (skipped with `--yes`):
   - For claude/codex: `default_model`, then `recon`, `oracle`, `architect`
   - For opencode: `provider`, then `build_model`, `plan_model`, then `recon`, `oracle`, `architect`
6. Validate and write config.
7. Generate files for the selected harness only.
8. If `--all`, install skills via `npx skills add`.

### `update`

```
atelier update [--harness <claude|opencode|codex>]
```

Without `--harness`, prompt user to select which configured harness(es) to update. With `--harness`, update only that harness. Regenerates config and agent files.

### `remove`

```
atelier remove [--harness <claude|opencode|codex>]
```

Without `--harness`, prompt user to select which configured harness(es) to remove. With `--harness`, remove only that harness. Deletes generated files for the selected harness, strips Atelier-managed keys from the harness config file (preserving custom keys), and removes its section from `.atelier/config.json`.

## Data Model

### Model Registry

```typescript
export const providers: Record<string, readonly Provider[]> = {
  claude: ['anthropic'],
  opencode: ['opencode-zen', 'opencode-go', 'amazon-bedrock'],
  codex: ['openai'],
} as const;

export const providerModels: Record<Provider, readonly string[]> = {
  anthropic: ['haiku', 'sonnet', 'opus', 'opusplan'],
  'opencode-zen': [
    'opencode/gpt-5.5',
    'opencode/gpt-5.4',
    'opencode/gpt-5.3-codex',
    'opencode/gpt-5.3-codex-spark',
    'opencode/claude-opus-4-7',
    // ... rest unchanged
  ],
  'opencode-go': [/* unchanged */],
  'amazon-bedrock': [/* unchanged */],
  openai: [
    'gpt-5.6-sol',
    'gpt-5.6-terra',
    'gpt-5.6-luna',
    'gpt-5.5',
    'gpt-5.4',
    'gpt-5.4-mini',
    'gpt-5.4-nano',
    'gpt-5.3-codex-spark',
  ],
} as const;

export const defaultModels: Record<Provider, Record<string, string>> = {
  anthropic: {
    recon: 'haiku',
    oracle: 'opus',
    architect: 'opus',
  },
  'opencode-zen': {
    recon: 'opencode/minimax-m2.7',
    oracle: 'opencode/kimi-k2.6',
    architect: 'opencode/deepseek-v4-pro',
    build: 'opencode/deepseek-v4-flash',
    plan: 'opencode/deepseek-v4-pro',
  },
  'opencode-go': {
    recon: 'opencode-go/minimax-m2.7',
    oracle: 'opencode-go/kimi-k2.6',
    architect: 'opencode-go/deepseek-v4-pro',
    build: 'opencode-go/deepseek-v4-flash',
    plan: 'opencode-go/deepseek-v4-pro',
  },
  'amazon-bedrock': {
    recon: 'amazon-bedrock/anthropic-claude-haiku-4-5',
    oracle: 'amazon-bedrock/anthropic-claude-opus-4-7',
    architect: 'amazon-bedrock/anthropic-claude-opus-4-7',
    build: 'amazon-bedrock/anthropic-claude-sonnet-4-5',
    plan: 'amazon-bedrock/anthropic-claude-haiku-4-5',
  },
  openai: {
    recon: 'gpt-5.6-luna',
    oracle: 'gpt-5.6-sol',
    architect: 'gpt-5.6-sol',
    default: 'gpt-5.6-terra',
  },
} as const;
```

### Config Schema

```typescript
const AgentSchema = z.object({
  template: z.string(),
  name: z.string(),
  model: z.string(),
});

const ClaudeConfigSchema = z.object({
  default_model: z.string(),
  agents: z.array(AgentSchema).min(1),
});

const CodexConfigSchema = z.object({
  default_model: z.string(),
  agents: z.array(AgentSchema).min(1),
});

const OpenCodeConfigSchema = z.object({
  provider: z.enum(['opencode-zen', 'opencode-go', 'amazon-bedrock']),
  build_model: z.string(),
  plan_model: z.string(),
  agents: z.array(AgentSchema).min(1),
});

const ConfigSchema = z.object({
  version: z.string(),
  skills_source: z.string(),
  skills_path: z.string().min(1),
  claude: ClaudeConfigSchema.optional(),
  codex: CodexConfigSchema.optional(),
  opencode: OpenCodeConfigSchema.optional(),
}).refine(data => data.claude || data.codex || data.opencode, {
  message: 'At least one harness must be configured',
});
```

Old flat config format is rejected by `readConfig` with a clear re-init error.

## Trade-offs

### Approach: Multi-harness config refactor (chosen)

**Pros:**
- Each harness has its own namespace; no implicit coupling
- Users can configure multiple AI tools for the same project
- Adding future harnesses (Cursor, etc.) is straightforward
- Codex config is no longer shoehorned into opencode or claude patterns

**Cons:**
- Breaking config change; users must re-init
- More complexity in init/update/remove scoping
- More code to maintain across three harnesses instead of two

### Alternative: Keep single-harness, add codex as third option

**Pros:**
- Smaller change, no config migration
- Simpler init/update/remove logic

**Cons:**
- Detection is still broken
- Config shape is still awkward (flat fields with implicit harness coupling)
- Cannot support multiple harnesses

**Why rejected:** The current single-harness design with auto-detection is the source of the original problem. Adding codex without fixing the core model would create more technical debt.

### Alternative: Codex as opencode variant

**Pros:**
- Minimal code changes

**Cons:**
- Codex uses TOML, not YAML frontmatter markdown
- Codex models don't share prefix conventions with opencode
- Confuses two distinct products

**Why rejected:** Codex is a distinct harness with different file formats and model conventions.

## Files to Create/Modify

```
src/
├── atelier.ts                 # MODIFY: update command options, --harness required for --yes
├── types.ts                   # MODIFY: Harness union + harness-scoped AtelierConfig
├── models.ts                  # MODIFY: add openai provider, remove backward-compat arrays
├── commands/
│   ├── init.ts                # MODIFY: remove detection, additive multi-harness
│   ├── update.ts              # MODIFY: harness selection prompt / --harness flag
│   └── remove.ts              # MODIFY: harness selection prompt / --harness flag
├── generators/
│   ├── codex.ts               # CREATE: .codex/config.toml + agents
│   ├── codex.test.ts          # CREATE: layer boundary tests
│   ├── claude.ts              # MODIFY: accept harness-scoped config
│   └── opencode.ts            # MODIFY: accept harness-scoped config
└── utils/
    ├── config.ts              # MODIFY: harness-scoped schema, old format error, Result-based readConfig
    ├── config.test.ts         # MODIFY: update tests for new schema and Result API
    ├── harness.ts             # CREATE: harness registry, prompts, dispatch, preview
    ├── result.ts              # CREATE: Result<T,E> type for explicit error handling
    ├── detect.ts              # DELETE: no auto-detection
    ├── templates.ts           # MODIFY: add getDeveloperInstructions() helper
    └── errors.ts              # MODIFY: add InvalidHarnessError / HarnessConfigError, opt-in re-init hint
```

## Success Criteria

- [ ] `atelier init --harness codex --yes` completes without errors
- [ ] `.codex/config.toml` sets model, reasoning_effort, multi_agent
- [ ] `.codex/agents/recon.toml`, `oracle.toml`, `architect.toml` generated with correct TOML format
- [ ] `atelier init --harness claude --yes` then `atelier init --harness codex --yes` produces multi-harness config
- [ ] `atelier update --harness codex` regenerates codex files without touching claude/opencode files
- [ ] `atelier remove --harness codex` deletes codex agent files, strips managed keys from `.codex/config.toml` while preserving custom keys, and removes `codex` section from config
- [ ] `atelier init --yes` without `--harness` exits with clear error
- [ ] Old flat `.atelier/config.json` format throws clear re-init error
- [ ] All existing tests updated and passing
- [ ] `bun run typecheck` and `bun test` pass

## Open Questions

None. All design decisions resolved.
