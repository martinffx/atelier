# Provider Selection for Model Configuration

## Problem

Currently, `atelier init` presents a flat list of all models for the selected harness. For the `opencode` harness, this mixes models from multiple providers (OpenCode Zen, OpenCode Go) into a single undifferentiated list. Users must know the prefix convention (`opencode/` vs `opencode-go/`) to understand which provider they're selecting. This is confusing and doesn't scale as we add more providers like AWS Bedrock.

**Who has this problem:** Anyone initializing atelier for OpenCode who wants to use a specific provider.

**How they solve it today:** They manually read the model list and infer the provider from the prefix.

## Scope

**In scope:**
- Add provider selection step after harness selection in `init`
- Restructure model registry to be provider-scoped
- Opinionated default models per provider
- Update `models.ts` with provider-scoped model lists
- Update `types.ts` to support provider configuration
- Update `init.ts` interactive flow
- Update `templates.ts` utilities
- Update `config.ts` default config generation
- Update tests

**Out of scope:**
- Provider configuration (API keys, regions, endpoints) — that's handled by `/connect` in OpenCode
- Adding more than the 3 specified providers for opencode
- Changing the `update` or `remove` commands
- Backward compatibility migration for existing configs

## User Stories

**US-1:** As a user initializing atelier for OpenCode, I want to select my provider (Zen, Go, or Bedrock) before selecting a model, so that I only see models available through my chosen provider.

- **Given** I run `atelier init` and select the `opencode` harness
- **When** the interactive flow reaches model selection
- **Then** I am first asked to choose a provider (OpenCode Zen, OpenCode Go, or Amazon Bedrock)
- **And** then I only see models from that provider

**US-2:** As a user selecting a provider, I want opinionated defaults for each agent role, so that I don't have to research which model to use for scout vs oracle vs architect.

- **Given** I have selected a provider
- **When** the model selection prompts appear
- **Then** each agent has a sensible default pre-selected based on the provider

**US-3:** As a user initializing atelier for Claude Code, I want the flow to remain simple, so that I'm not burdened with provider selection when there's only one option.

- **Given** I run `atelier init` and select the `claude` harness
- **When** the interactive flow reaches model selection
- **Then** provider selection is skipped (Anthropic is implicit)
- **And** I see the existing Claude model list directly

## Constraints

- Maintain backward compatibility for `claude` harness flow
- Config format should remain simple and human-readable
- Must work with `--yes` non-interactive mode
- Must work with existing `update` command (regenerates from existing config)

## Context

### Current Flow

```
init → detect harness → select harness (claude/opencode) → select models from flat list → write config → generate files
```

Current `models.ts` has two flat arrays:
- `claudModels`: `['haiku', 'sonnet', 'opus']`
- `opencodeModels`: mixed `opencode/*` and `opencode-go/*` prefixes

Current `AtelierConfig`:
```typescript
interface AtelierConfig {
  version: string;
  harness: Harness;
  skills_source: string;
  skills_path: string;
  agents: AgentConfig[];
}
```

Current `AgentConfig`:
```typescript
interface AgentConfig {
  template: string;
  name: string;
  model: string;
}
```

### OpenCode Provider Model IDs

**OpenCode Zen** (`opencode/` prefix):
- GPT family: `gpt-5.5`, `gpt-5.4`, `gpt-5.3-codex`, `gpt-5.3-codex-spark`, `gpt-5.2`, `gpt-5.1`, `gpt-5`
- Claude family: `claude-opus-4-7`, `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-sonnet-4-5`, `claude-haiku-4-5`
- Others: `qwen3.6-plus`, `minimax-m2.7`, `kimi-k2.6`, `glm-5.1`, `gemini-3.1-pro`, `gemini-3-flash`

**OpenCode Go** (`opencode-go/` prefix):
- `glm-5.1`, `glm-5`
- `kimi-k2.5`, `kimi-k2.6`
- `deepseek-v4-pro`, `deepseek-v4-flash`
- `minimax-m2.7`, `minimax-m2.5`
- `qwen3.5-plus`, `qwen3.6-plus`
- `mimo-v2.5`, `mimo-v2.5-pro`

**Amazon Bedrock** (`amazon-bedrock/` prefix):
- Claude models: `anthropic-claude-sonnet-4-5`, `anthropic-claude-haiku-4-5`, `anthropic-claude-opus-4-7`
- (User configures actual ARNs in `opencode.json`, we provide friendly names)

### Existing Files to Modify

- `src/models.ts` — restructure from flat arrays to provider-scoped registry
- `src/types.ts` — add `Provider` type and update config interfaces
- `src/utils/templates.ts` — update `getModelsForHarness` to accept provider
- `src/utils/config.ts` — update `getDefaultConfig` to include provider
- `src/commands/init.ts` — add provider selection prompt
- `src/generators/opencode.ts` — potentially update generated `opencode.json` with provider config hints
- Tests for all modified files

## Architecture

### Provider Model

```
Provider
├── id: string (e.g., "opencode-zen", "opencode-go", "amazon-bedrock", "anthropic")
├── name: string (display name)
├── harness: Harness (which harness this provider belongs to)
└── models: string[]
```

### Config Update

The `AtelierConfig` gains a `provider` field:

```typescript
interface AtelierConfig {
  version: string;
  harness: Harness;
  provider?: string;  // undefined for claude (anthropic implicit)
  skills_source: string;
  skills_path: string;
  agents: AgentConfig[];
}
```

For `claude` harness, `provider` is omitted/undefined (Anthropic is the only provider).
For `opencode` harness, `provider` is required and one of: `opencode-zen`, `opencode-go`, `amazon-bedrock`.

### New Flow

```
init → detect harness → select harness (claude/opencode)
  ├─ claude → select models from claude list → write config → generate files
  └─ opencode → select provider (zen/go/bedrock) → select models from provider list → write config → generate files
```

## API Design

No external API changes. Internal utility function signatures:

```typescript
// templates.ts
export function getModelsForProvider(provider: string): readonly string[];
export function getDefaultModel(provider: string, agentName: string): string;

// config.ts
export function getDefaultConfig(harness: Harness, provider?: string): AtelierConfig;
```

## Data Model

### New `models.ts` Structure

```typescript
export type Provider = 'opencode-zen' | 'opencode-go' | 'amazon-bedrock' | 'anthropic';

export const providers: Record<Harness, readonly string[]> = {
  claude: ['anthropic'],
  opencode: ['opencode-zen', 'opencode-go', 'amazon-bedrock'],
} as const;

export const providerModels: Record<Provider, readonly string[]> = {
  'anthropic': ['haiku', 'sonnet', 'opus'],
  'opencode-zen': [
    'opencode/gpt-5.5',
    'opencode/gpt-5.4',
    'opencode/gpt-5.3-codex',
    'opencode/gpt-5.3-codex-spark',
    'opencode/claude-opus-4-7',
    'opencode/claude-sonnet-4-6',
    'opencode/claude-haiku-4-5',
    'opencode/qwen3.6-plus',
    'opencode/minimax-m2.7',
    'opencode/kimi-k2.6',
    'opencode/glm-5.1',
  ],
  'opencode-go': [
    'opencode-go/glm-5.1',
    'opencode-go/glm-5',
    'opencode-go/kimi-k2.5',
    'opencode-go/kimi-k2.6',
    'opencode-go/deepseek-v4-pro',
    'opencode-go/deepseek-v4-flash',
    'opencode-go/minimax-m2.7',
    'opencode-go/minimax-m2.5',
    'opencode-go/qwen3.5-plus',
    'opencode-go/qwen3.6-plus',
    'opencode-go/mimo-v2.5',
    'opencode-go/mimo-v2.5-pro',
  ],
  'amazon-bedrock': [
    'amazon-bedrock/anthropic-claude-sonnet-4-5',
    'amazon-bedrock/anthropic-claude-haiku-4-5',
    'amazon-bedrock/anthropic-claude-opus-4-7',
  ],
} as const;

export const defaultModels: Record<Provider, Record<string, string>> = {
  'anthropic': {
    scout: 'haiku',
    oracle: 'opus',
    architect: 'opus',
  },
  'opencode-zen': {
    scout: 'opencode/deepseek-v4-flash',
    oracle: 'opencode/kimi-k2.6',
    architect: 'opencode/deepseek-v4-pro',
  },
  'opencode-go': {
    scout: 'opencode-go/deepseek-v4-flash',
    oracle: 'opencode-go/kimi-k2.6',
    architect: 'opencode-go/deepseek-v4-pro',
  },
  'amazon-bedrock': {
    scout: 'amazon-bedrock/anthropic-claude-haiku-4-5',
    oracle: 'amazon-bedrock/anthropic-claude-opus-4-7',
    architect: 'amazon-bedrock/anthropic-claude-opus-4-7',
  },
} as const;
```

## Trade-offs

### Option A: Add `provider` field to config (chosen)
- **Pros:** Simple, explicit, backward compatible for claude
- **Cons:** Slightly more complex config, need to handle `provider` being undefined for claude

### Option B: Encode provider in model prefix
- **Pros:** No config changes needed
- **Cons:** Doesn't actually solve the UX problem, still shows flat list

### Option C: Replace harness with provider
- **Pros:** Provider is the primary concept
- **Cons:** Big breaking change, claude doesn't have multiple providers

**Recommendation:** Option A — minimal disruption, clear semantics.

## Open Questions

1. Should `--yes` mode default to a specific provider for opencode? (Default: `opencode-zen`)
2. Should we validate that the provider matches the harness on config read? (Yes, defensive)
3. Should the generated `opencode.json` include provider hints for Bedrock? (Yes, comment or config section)

## Implementation Notes

- Update `init.ts` to add provider prompt only when `harness === 'opencode'`
- Update `getDefaultConfig` signature: `getDefaultConfig(harness, provider?)`
- Update `getModelsForHarness` → `getModelsForProvider`
- Update tests to cover provider selection flow
- Add validation in `readConfig` to ensure provider is valid for harness
