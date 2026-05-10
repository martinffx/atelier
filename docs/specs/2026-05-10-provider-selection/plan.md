# Implementation Plan: Provider Selection for Model Configuration

## Goal
Add provider selection to `atelier init` for OpenCode harness, restructure model registry to be provider-scoped, and maintain backward compatibility for Claude harness.

## Phase 1: Domain Model & Types

### T1: Update `src/models.ts` with provider-scoped registry
**Depends on:** None

**Inputs:**
- Approved design.md with provider definitions
- Current `models.ts` structure (flat arrays)

**Description:**
Replace the flat `claudModels` and `opencodeModels` arrays with a provider-scoped model registry. Add `Provider` type, `providers` map, `providerModels` map, and `defaultModels` map keyed by provider.

Keep backward compatibility by exporting the old names as deprecated aliases if needed (or just update all callers).

**Files:**
- **Modify:** `src/models.ts`

**Validation:**
- All provider IDs are valid
- All model arrays are non-empty
- Default models exist in their provider's model list
- TypeScript compiles without errors

---

### T2: Update `src/types.ts` to add provider to config
**Depends on:** T1

**Inputs:**
- New `Provider` type from T1
- Current `AtelierConfig` interface

**Description:**
Add optional `provider?: string` field to `AtelierConfig` interface. Add `Provider` export. Ensure config type is backward compatible (provider is optional, omitted for claude).

**Files:**
- **Modify:** `src/types.ts`

**Validation:**
- `AtelierConfig` type-checks with and without provider
- `Provider` type is exported and usable

---

## Phase 2: Utilities

### T3: Update `src/utils/templates.ts` for provider-scoped queries
**Depends on:** T1, T2

**Inputs:**
- New `providerModels` and `defaultModels` from T1
- Current `getModelsForHarness()` and `getDefaultModel()` signatures

**Description:**
Replace `getModelsForHarness(harness)` with `getModelsForProvider(provider)`.
Replace `getDefaultModel(harness, agentName)` with `getDefaultModel(provider, agentName)`.

For backward compatibility, keep `getModelsForHarness` as a thin wrapper that returns claude models for `'claude'` or throws for `'opencode'` (since it now requires a provider).

**Files:**
- **Modify:** `src/utils/templates.ts`

**Validation:**
- `getModelsForProvider('opencode-zen')` returns zen models
- `getModelsForProvider('opencode-go')` returns go models
- `getModelsForProvider('amazon-bedrock')` returns bedrock models
- `getDefaultModel('anthropic', 'scout')` returns `'haiku'`
- Tests pass

---

### T4: Update `src/utils/config.ts` for provider-aware defaults
**Depends on:** T1, T2, T3

**Inputs:**
- New `getDefaultModel(provider, agentName)` from T3
- Current `getDefaultConfig(harness)` signature

**Description:**
Update `getDefaultConfig` to accept an optional `provider` parameter. When `harness === 'opencode'`, require provider and use it to look up default models. When `harness === 'claude'`, omit provider from config and use `'anthropic'` defaults.

Add config validation to `readConfig` that ensures:
- If `harness === 'opencode'`, `provider` must be defined and valid
- If `harness === 'claude'`, `provider` should be undefined

**Files:**
- **Modify:** `src/utils/config.ts`

**Validation:**
- `getDefaultConfig('claude')` returns config without provider
- `getDefaultConfig('opencode', 'opencode-zen')` returns config with provider and zen defaults
- `readConfig` validates provider/harness consistency

---

## Phase 3: CLI Command

### T5: Update `src/commands/init.ts` with provider selection
**Depends on:** T1, T2, T3, T4

**Inputs:**
- New `getModelsForProvider()` and `getDefaultConfig(harness, provider)` from T3/T4
- Current `init.ts` interactive flow
- Current test file `src/commands/init.test.ts`

**Description:**
Add provider selection prompt when `harness === 'opencode'` and not in `--yes` mode.

New flow for opencode:
1. Detect/select harness → `'opencode'`
2. Prompt: "Which provider are you using?" choices: `['OpenCode Zen', 'OpenCode Go', 'Amazon Bedrock']`
3. Map display name to provider ID (`opencode-zen`, `opencode-go`, `amazon-bedrock`)
4. Call `getDefaultConfig('opencode', providerId)`
5. For each agent, prompt with models from `getModelsForProvider(providerId)`

For `--yes` mode: default to `'opencode-zen'` for opencode harness.

Update all tests to cover:
- Provider selection flow
- `--yes` mode defaults to zen
- Model list is scoped to provider

**Files:**
- **Modify:** `src/commands/init.ts`
- **Modify:** `src/commands/init.test.ts`

**Validation:**
- Interactive init for opencode prompts for provider
- Provider selection shows correct model list
- `--yes` defaults to opencode-zen
- Claude flow unchanged (no provider prompt)
- All tests pass

---

## Phase 4: Generators (Optional Enhancement)

### T6: Update `src/generators/opencode.ts` with provider hints
**Depends on:** T5

**Inputs:**
- Config with `provider` field
- Current `opencode.ts` generator

**Description:**
When generating `opencode.json`, if provider is `'amazon-bedrock'`, include a comment or config section indicating Bedrock-specific setup (region, profile options). This is a nice-to-have — the primary Bedrock configuration is done via `/connect` in OpenCode itself.

**Files:**
- **Modify:** `src/generators/opencode.ts`

**Validation:**
- Generated files still valid
- No breaking changes to existing generation

---

## Task Dependency Graph

```
T1 (models.ts)
  → T2 (types.ts)
    → T3 (templates.ts)
      → T4 (config.ts)
        → T5 (init.ts + tests)
          → T6 (opencode.ts) [optional]
```

## Risk Areas

1. **Backward compatibility:** Existing configs without `provider` field — `readConfig` validation must handle gracefully
2. **Test coverage:** `init.test.ts` likely mocks inquirer heavily — provider prompt adds complexity
3. **Default model quality:** Opinionated defaults should be reviewed

## Estimates

| Task | Effort |
|------|--------|
| T1: models.ts | 15 min |
| T2: types.ts | 10 min |
| T3: templates.ts | 20 min |
| T4: config.ts | 20 min |
| T5: init.ts + tests | 45 min |
| T6: opencode.ts | 15 min |
| **Total** | **~2 hours** |
