# Harness Registry Refactor

## Problem

The Atelier CLI currently has a thin `src/harness.ts` dispatch layer that delegates to `src/generators/{claude,opencode,codex}.ts`. Adding a new harness requires touching dispatch, generators, config schema, prompting, and command logic separately. The generators also still carry hook/plugin logic that has been explicitly removed from scope.

We need a true harness registry: a static map of adapters where each adapter owns translation of agnostic agent definitions and shared config into its harness-native format.

## Scope

**In scope:**
- Define a `HarnessAdapter` interface in `src/types.ts`.
- Create a static registry in `src/registry.ts`.
- Move generator logic into `src/adapters/{claude,opencode,codex,index}.ts`.
- Make `src/commands/{init,update,remove}.ts` generic orchestrators that operate on a single harness.
- Add cross-cutting services: `src/services/paths.ts` and `src/services/prompt.ts`.
- Compose the `AtelierConfig` Zod schema from registered adapters in `src/utils/config.ts`.
- Add an optional `provider` field to simple harness config with harness defaults.
- Update tests: move generator tests to adapter tests, update command and config tests.
- Remove hooks, plugins, session-start code, `src/harness.ts`, `src/models.ts`, and the `src/generators/` directory.

**Out of scope:**
- Dynamic adapter discovery or plugin loading.
- Runtime scanning of `agents/*.md` (static list is sufficient).
- Skill installation or skill wrapper generation (managed by `npx skills`).
- Project-local install support (global-only for now).
- Migrating old flat `.atelier/config.json` format (hard cut, re-init required).

## User Stories

**US-1:** As a maintainer, I want to add a new harness by creating one adapter and registering it, so that I don't touch dispatch, config schema, or command logic.
- Given a new harness `cursor`, when I create `src/adapters/cursor.ts`, add it to `src/adapters/index.ts`, and add `cursor` to `HARNESS_NAMES`, then `atelier init --harness cursor` works without modifying `src/commands/init.ts`.
- Priority: must

**US-2:** As a user, I want `init` to configure one harness without affecting others, so that I can add harnesses incrementally.
- Given an existing claude config, when I run `atelier init --harness codex`, then the config gains a codex section and claude files are untouched.
- Priority: must

**US-3:** As a user, I want `update` to regenerate files for one selected harness.
- Given claude+codex configs, when I run `atelier update --harness codex`, then only codex files are regenerated.
- Priority: must

**US-4:** As a user, I want `remove` to delete only Atelier-managed files for one harness and preserve my custom settings.
- Given a codex config, when I run `atelier remove --harness codex`, then codex agent files are deleted, custom keys in `.codex/config.toml` are preserved, and the `codex` section is removed from `.atelier/config.json`.
- Priority: must

**US-5:** As a maintainer, I want adapter tests to verify file generation in isolation, so that harnesses can be tested independently.
- Given a codex adapter test, when it runs with a temp directory and a stub config, then it asserts the exact files and content written.
- Priority: should

## Constraints

- Built with the existing TypeScript + Bun toolchain.
- Single harness per command invocation.
- Global-only installs (no project-local support yet).
- Adapters perform their own file I/O (active installer pattern).
- Adapters are the only components that know a harness's native file layout.
- Config schema is composed from registered adapters so new harnesses extend validation automatically.
- Old flat config format is unsupported; `readConfig` throws a clear re-init error.

## Context

The previous codex-support spec established the multi-harness config shape. This refactor builds on that by introducing a registry layer between the CLI commands and the harness-specific generators.

See `CONTEXT.md` for the precise domain language: `Harness`, `Adapter`, `Registry`, `Provider`, `Model`, `Agent Template`, `Agent / Subagent`, `AtelierConfig`, `HarnessConfig`.

Key decisions from `CONTEXT.md`:
- `Provider` is the model-hosting service, independent of harness.
- `Adapter` installs agents and harness-native config only; no skill installation.
- `Registry` is a static, compile-time map.
- `Agent` is a one-to-one translation from a static `Agent Template`.
- `AtelierConfig` is the CLI's persisted state; `HarnessConfig` is the harness's native file.

## Architecture

### Component Structure

```
src/
├── atelier.ts              # CLI entry; uses HARNESS_NAMES for --harness validation
├── types.ts                # Harness union, HarnessAdapter interface, config types
├── registry.ts             # Static adapter registry: Record<Harness, HarnessAdapter>
├── adapters/
│   ├── index.ts            # Self-register all adapters
│   ├── claude.ts           # .claude/settings.json + .claude/agents/*.md
│   ├── opencode.ts         # opencode.json + .opencode/agent/*.md
│   └── codex.ts            # .codex/config.toml + .codex/agents/*.toml
├── services/
│   ├── paths.ts            # shortPath, basePath helpers
│   └── prompt.ts           # generic model/provider prompts from adapter metadata
├── commands/
│   ├── init.ts             # generic: pick harness → get adapter → prompt → install
│   ├── update.ts           # generic: pick one configured harness → regenerate
│   └── remove.ts           # generic: pick one configured harness → remove
└── utils/
    ├── config.ts           # compose Zod schema from registered adapters
    ├── result.ts           # Result<T,E> type
    └── errors.ts           # typed errors
```

### Domain Model

- **Registry** owns the static map of harness → adapter.
- **Adapter** is the only component that knows a harness's native file layout and format.
- **Commands** are generic orchestrators; they never reference `.claude/`, `.codex/`, or `.opencode/` directly.
- **Services** are cross-cutting helpers: path resolution and prompting.
- **Config** composes the Zod schema by asking each adapter for its section schema.

### Adapter Interface

```typescript
interface HarnessAdapter {
  name: Harness;
  providerChoices?: ProviderChoice[];
  configSchema: ZodSchema;
  defaultSection(provider?: Provider): HarnessSection;
  modelsForProvider(provider?: Provider): readonly string[];
  installAgents(shared: SharedConfig, section: HarnessSection, basePath: string): void;
  mergeHarnessConfig(shared: SharedConfig, section: HarnessSection, basePath: string): void;
  fileList(basePath: string): FileEntry[];
  remove(shared: SharedConfig, section: HarnessSection, basePath: string): void;
}
```

`modelsForProvider` returns the available model identifiers for the harness/provider combination. Default models live inside each adapter module and feed `defaultSection()`.

### IO Boundary

- Adapters perform their own file I/O (active installer pattern).
- Tests use temp directories and assert on filesystem output.

## Commands

### `init [--harness <harness>] [--yes]`

1. Validate `--harness` against `HARNESS_NAMES`.
2. If `--yes` without `--harness`, throw a clear error.
3. If no `--harness`, show interactive single-select picker.
4. Get the adapter from the registry.
5. Build a default section via `adapter.defaultSection()`.
6. Prompt for provider (if `adapter.providerChoices` is defined) and models via `prompt.ts`.
7. Write/merge the updated `.atelier/config.json`.
8. Call `adapter.mergeHarnessConfig()` then `adapter.installAgents()`.

### `update [--harness <harness>]`

1. Read `.atelier/config.json`.
2. If no `--harness`, prompt for one configured harness.
3. Get the adapter from the registry.
4. Call `adapter.mergeHarnessConfig()` and `adapter.installAgents()`.

### `remove [--harness <harness>]`

1. Read `.atelier/config.json`.
2. If no `--harness`, prompt for one configured harness.
3. Get the adapter from the registry.
4. Call `adapter.remove()`.
5. Remove the harness section from `.atelier/config.json`.

## Data Model

### Harness Names

```typescript
export const HARNESS_NAMES = ['claude', 'opencode', 'codex'] as const;
export type Harness = typeof HARNESS_NAMES[number];
```

Both the CLI and the registry share this single source of truth.

### Config Schema

The shared pieces are:

```typescript
const AgentSchema = z.object({
  template: z.enum(AGENT_NAMES),
  name: z.enum(AGENT_NAMES),
  model: z.string(),
});

const SimpleConfigSchema = z.object({
  provider: z.string().optional(),
  default_model: z.string(),
  agents: z.array(AgentSchema).min(1),
});

const OpenCodeConfigSchema = z.object({
  provider: z.enum(OPENCODE_PROVIDERS),
  build_model: z.string(),
  plan_model: z.string(),
  agents: z.array(AgentSchema).min(1),
});
```

The top-level schema is composed dynamically from the registered adapters:

```typescript
const adapterSections = Object.fromEntries(
  listAdapters().map(adapter => [adapter.name, adapter.configSchema])
);

const ConfigSchema = z.object({
  version: z.string(),
  skills_source: z.string(),
  skills_path: z.string().min(1),
  ...adapterSections,
}).refine(data => data.claude || data.codex || data.opencode, {
  message: 'At least one harness must be configured',
});
```

`AtelierConfig` remains typed as `SharedConfig & Partial<Record<Harness, HarnessSection>>`, so the dynamic schema and the TypeScript types stay aligned.

The optional `provider` field in `SimpleConfigSchema` defaults to `anthropic` for Claude and `openai` for Codex when reading or writing config.

## Trade-offs

### Chosen: Static registry of active-installer adapters

- **Pros:** Simple, deterministic, easy to add a harness by registering one adapter.
- **Cons:** Adding a harness requires editing `registry.ts` and `HARNESS_NAMES`; no runtime plugin model.

### Alternative: Functional core returning file operations

- **Pros:** Easier to test; I/O pushed to a single service.
- **Cons:** More indirection; adapters must return a structured operation language instead of writing directly.
- **Why rejected:** Active-installer adapters keep the code closest to the existing generators and reduce abstraction overhead.

### Alternative: Dynamic adapter discovery

- **Pros:** New harnesses without recompiling.
- **Cons:** Requires filesystem scanning or plugin loading; overkill for three harnesses.
- **Why rejected:** Static registry is simpler and sufficient.

## Open Questions

All resolved:

1. **Does `--all` still run `npx skills add`?** No — the `--all` flag is removed. Skills are installed separately via `npx skills`.
2. **Project-local install support?** Global-only for now; no `Paths` abstraction.
3. **Old config migration?** Keep the hard cut; `readConfig` throws a clear re-init error.

## Files to Create / Modify

### Create
- `src/types.ts` (new `HarnessAdapter` interface, harness union, config types)
- `src/registry.ts` (static registry)
- `src/adapters/{claude,opencode,codex,index}.ts` (adapter implementations and self-registration)
- `src/services/{paths,prompt}.ts` (cross-cutting helpers)
- `docs/specs/2026-07-18-harness-registry/design.md` (this spec)

### Modify
- `src/commands/{init,update,remove}.ts` (generic orchestrators)
- `src/utils/config.ts` (compose schema from registered adapters)
- `src/utils/templates.ts` (remove dead `getModelsForProvider` after model metadata moves into adapters)
- `src/utils/errors.ts` (update error messages)
- `src/atelier.ts` (remove `--all`, validate harness from union)
- `README.md` (remove `--all`, `--project`, update architecture description)
- `package.json` if needed for exports

### Delete
- `src/harness.ts`
- `src/models.ts`
- `src/generators/` directory
- Hook/plugin code paths inside adapters

### Tests
- Move `src/generators/*.test.ts` to `src/adapters/*.test.ts`
- Remove hook/plugin assertions
- Update `init.test.ts`, `update-remove.test.ts`, `config.test.ts`

## Success Criteria

- [ ] `bun run typecheck` passes
- [ ] `bun test` passes
- [ ] `atelier init --harness codex --yes` completes without errors
- [ ] `atelier init --harness claude --yes` then `atelier init --harness codex --yes` produces a multi-harness config
- [ ] `atelier update --harness codex` regenerates only codex files
- [ ] `atelier remove --harness codex` deletes codex agent files, preserves custom keys in `.codex/config.toml`, and removes the codex section from `.atelier/config.json`
- [ ] Adding a new adapter + harness name requires no changes to commands
- [ ] Old flat config format throws a clear re-init error
