# Implementation Plan: Harness Registry Refactor

## Goal

Reshape the Atelier CLI from a harness-aware dispatch layer into a static registry of adapters, where each adapter owns translation to its harness-native format.

## Phases

### P1: Foundation

**T1: Define harness union and adapter interface**
- Inputs: approved design.md, current `src/types.ts`
- Description: Replace the loose `Harness` type with a const array + union shared by CLI and registry. Define the `HarnessAdapter` interface, `HarnessSection`, `SharedConfig`, and supporting types. Remove hook/plugin-specific types.
- Files:
  - Modify: `src/types.ts`
- Validation:
  - `bun run typecheck` passes
  - `Harness` union derives from `HARNESS_NAMES`
  - `HarnessAdapter` interface includes all required methods

**T2: Create path service**
- Inputs: current `src/harness.ts` path helpers, design.md
- Description: Extract `shortPath` and global base-path resolution into `src/services/paths.ts`. Keep global-only behavior; no project-local support. Harness-specific path logic (e.g. OpenCode root resolution) stays in its adapter.
- Files:
  - Create: `src/services/paths.ts`
- Validation:
  - `shortPath('~')` returns `~`
  - `resolveBasePath('claude')` returns `homedir()`
  - `resolveBasePath('opencode')` returns global opencode dir

**T3: Create prompt service**
- Inputs: current `src/harness.ts` prompting logic, `inquirer` usage, `HarnessAdapter.modelsForProvider`
- Description: Extract generic provider/model prompting into `src/services/prompt.ts`. It consumes `providerChoices` and `modelsForProvider()` from an adapter and returns a completed section.
- Files:
  - Create: `src/services/prompt.ts`
- Validation:
  - Prompts for provider when `providerChoices` exist
  - Prompts for default model and each agent model using `adapter.modelsForProvider()`
  - Returns a valid `HarnessSection`

### P2: Registry

**T4: Create static registry**
- Inputs: design.md, `HarnessAdapter` interface
- Description: Create `src/registry.ts` with `registerAdapter`, `getAdapter`, and `listAdapters`. The registry is a plain map + accessor functions; real population happens in `src/adapters/index.ts` via self-registration.
- Files:
  - Create: `src/registry.ts`
- Validation:
  - `registerAdapter`/`getAdapter`/`listAdapters` work with a stub adapter
  - Throws typed error for unknown harness
  - Real population verified by T8

### P3: Adapters

**T5: Create Claude adapter**
- Inputs: `src/generators/claude.ts`, static agent list, `src/services/paths.ts`
- Description: Move Claude generator logic into `src/adapters/claude.ts`. Move the `anthropic` model metadata (`providerModels`/`defaultModels` slices) into the adapter. Implement `mergeHarnessConfig` (`.claude/settings.json`), `installAgents` (`.claude/agents/*.md`), `modelsForProvider`, `fileList`, and `remove`. Drop hook generation.
- Files:
  - Create: `src/adapters/claude.ts`
  - Create: `src/adapters/claude.test.ts`
- Validation:
  - Generates `.claude/agents/{recon,oracle,architect}.md`
  - Merges `.claude/settings.json` without hooks
  - `modelsForProvider` returns anthropic models
  - `fileList` reports all managed files
  - `remove` deletes agent files and strips Atelier settings

**T6: Create OpenCode adapter**
- Inputs: `src/generators/opencode.ts`, `src/services/paths.ts`
- Description: Move OpenCode generator logic into `src/adapters/opencode.ts`. Move OpenCode provider model metadata into the adapter. Implement config merge for `opencode.json`, agent generation for `.opencode/agent/*.md`, `modelsForProvider`, `fileList`, and `remove`. Drop the plugin generator, the `command/*.md` skill-wrapper generator, and the skill metadata readers (`readSkillMetadata`, `getUserInvocableSkillNames`, `resolveSkillsPath`).
- Files:
  - Create: `src/adapters/opencode.ts`
  - Create: `src/adapters/opencode.test.ts`
- Validation:
  - Generates `.opencode/agent/*.md`
  - Merges `opencode.json`
  - `modelsForProvider` returns provider-scoped models
  - Does not write `plugins/` or `command/` files
  - `fileList` and `remove` work correctly

**T7: Create Codex adapter**
- Inputs: `src/generators/codex.ts`, `src/services/paths.ts`
- Description: Move Codex generator logic into `src/adapters/codex.ts`. Move the `openai` model metadata into the adapter. Implement config merge for `.codex/config.toml`, agent generation for `.codex/agents/*.toml`, `modelsForProvider`, `fileList`, and `remove`.
- Files:
  - Create: `src/adapters/codex.ts`
  - Create: `src/adapters/codex.test.ts`
- Validation:
  - Generates `.codex/config.toml` and `.codex/agents/*.toml`
  - `modelsForProvider` returns openai models
  - Merges preserve custom keys
  - `fileList` and `remove` work correctly

**T8: Create adapter index**
- Inputs: T4, T5, T6, T7
- Description: Create `src/adapters/index.ts` that imports each adapter, calls `registerAdapter`, and re-exports the adapter objects. Importing this module side-loads all adapters into the registry.
- Files:
  - Create: `src/adapters/index.ts`
- Validation:
  - `bun run typecheck` passes
  - `listAdapters()` returns claude, opencode, codex after importing the index
  - `getAdapter('claude')` returns the Claude adapter

### P4: Config

**T9: Compose config schema from adapters**
- Inputs: `src/utils/config.ts`, `HarnessAdapter.configSchema`, design.md
- Description: Refactor `src/utils/config.ts` so the top-level Zod schema is built from the registered adapters' `configSchema`. Add optional `provider` to `SimpleConfigSchema` with harness defaults.
- Files:
  - Modify: `src/utils/config.ts`
  - Modify: `src/utils/config.test.ts`
- Validation:
  - Validates multi-harness config correctly
  - Rejects old flat format with clear error
  - Applies default provider when missing

### P5: Commands

**T10: Generic init command**
- Inputs: `src/commands/init.ts`, registry, prompt service
- Description: Rewrite `init` to use the registry and adapter. Single harness per invocation. Remove auto-detection, the `--all` flag, the `npx skills add` exec path, `InitOptions.all`, and any now-dead error types.
- Files:
  - Modify: `src/commands/init.ts`
  - Modify: `src/commands/init.test.ts`
- Validation:
  - `init --harness codex --yes` works
  - `init --yes` without `--harness` errors
  - Adding a second harness preserves the first

**T11: Generic update command**
- Inputs: `src/commands/update.ts`, registry
- Description: Rewrite `update` to select one configured harness and call `adapter.mergeHarnessConfig` + `adapter.installAgents`.
- Files:
  - Modify: `src/commands/update.ts`
  - Modify: `src/commands/update-remove.test.ts`
- Validation:
  - `update --harness codex` regenerates only codex files
  - Prompts when no `--harness` and multiple harnesses configured

**T12: Generic remove command**
- Inputs: `src/commands/remove.ts`, registry
- Description: Rewrite `remove` to select one configured harness and call `adapter.remove`.
- Files:
  - Modify: `src/commands/remove.ts`
  - Modify: `src/commands/update-remove.test.ts`
- Validation:
  - `remove --harness codex` removes only codex files
  - Preserves custom keys in `.codex/config.toml`
  - Removes harness section from `.atelier/config.json`

### P6: Entry and Cleanup

**T13: Update CLI entry**
- Inputs: `src/atelier.ts`, `HARNESS_NAMES`
- Description: Remove `--all` flag. Use `HARNESS_NAMES` for `--harness` validation/help.
- Files:
  - Modify: `src/atelier.ts`
- Validation:
  - `bun run typecheck` passes
  - `--help` shows valid harness values

**T14: Delete old files**
- Inputs: design.md files-to-delete list
- Description: Delete `src/harness.ts`, `src/models.ts`, and the `src/generators/` directory. Remove the dead `getModelsForProvider` function and `providerModels` import from `src/utils/templates.ts` (template reading itself stays). Remove any hook/plugin code paths.
- Files:
  - Delete: `src/harness.ts`
  - Delete: `src/models.ts`
  - Delete: `src/generators/` directory
  - Modify: `src/utils/templates.ts`
- Validation:
  - `bun run typecheck` passes
  - No references to deleted files remain

**T15: Update README**
- Inputs: README.md, design.md
- Description: Remove references to `--all`, `--project`, session hooks, plugins, and skills being installed by the CLI. Update architecture description to mention the registry.
- Files:
  - Modify: `README.md`
- Validation:
  - README accurately reflects current CLI behavior

### P7: Final Verification

**T16: Run typecheck and tests**
- Inputs: all previous tasks
- Description: Run `bun run typecheck` and `bun test`. Fix any remaining issues.
- Files:
  - Modify: any files needed to fix failures
- Validation:
  - `bun run typecheck` passes
  - `bun test` passes

## Dependencies

```
T1 → T2, T3, T4, T5, T6, T7
T2 → T5, T6, T7
T3 → T10
T4, T5, T6, T7 → T8
T8, T9, T3 → T10
T8, T9 → T11, T12
T10, T11, T12 → T13
T13, T14 → T15
T15 → T16
```

## Task Tracking

Use beads to create an epic and tasks with `blocks` dependencies.
