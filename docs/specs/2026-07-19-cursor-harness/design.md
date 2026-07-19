# Cursor Harness Support

## Problem

Atelier configures Claude Code, OpenCode, and Codex through a static harness-adapter registry, but developers using Cursor Agent CLI must manually create and maintain their specialized subagents. The CLI should generate those subagents consistently while Cursor continues to own its native configuration and primary model.

## Scope

**In scope:**

- Add `cursor` as a fourth harness to the static registry and CLI selection.
- Generate global Cursor subagents at `~/.cursor/agents/{recon,oracle,architect}.md`.
- Persist Cursor's subagent model selections in `~/.atelier/config.json`.
- Provide a static, curated Cursor model list and interactive model selection.
- Use these default models:
  - Recon subagent: `composer-2.5`
  - Oracle subagent: `claude-opus-4-8-high`
  - Architect subagent: `gpt-5.6-sol-medium`
- Support Cursor through the existing `init`, `update`, and `remove` workflows.
- Update documentation and layer-boundary tests for the fourth harness.

**Out of scope:**

- Installing or generating skills. Cursor discovers Atelier skills from `~/.agents/skills`, which remains managed by `npx skills`.
- Configuring Cursor project permissions in `.cursor/cli.json`.
- Configuring Cursor's primary model, including per-mode model defaults.
- Reading, writing, validating, or merging `~/.cursor/cli-config.json`.
- Editing Cursor editor-only modes or user-created agents.
- Discovering models dynamically from a Cursor account.

## Constraints

- Keep the existing TypeScript and Bun toolchain; do not add a dependency unless the implementation requires it.
- The adapter performs its own file I/O, matching the active-installer adapter pattern.
- Cursor owns its global primary model and all native CLI configuration.
- Cursor's project-level `.cursor/cli.json` is not managed by Atelier.
- `init` and `update` generate Cursor subagents only. Removal deletes only Atelier-generated subagents and the Cursor section from Atelier config.

## Context

### Existing Atelier Architecture

The harness-registry refactor established a static adapter model:

- `src/constants.ts` defines the `HARNESS_NAMES` source of truth.
- `src/types.ts` derives the `Harness` union from that list and defines the `HarnessAdapter` interface.
- `src/adapters/index.ts` self-registers each adapter with `src/registry.ts`.
- `src/commands/{init,update,remove}.ts` are generic orchestrators. They resolve the selected adapter, derive a base path, then call `mergeHarnessConfig`, `installAgents`, or `remove`.
- `src/utils/config.ts` composes the persisted `.atelier/config.json` Zod schema from the registered adapters. Adding an adapter automatically adds its optional config section to validation.
- `src/services/prompt.ts` currently supports the common simple configuration shape (`default_model` plus three agent models) and the OpenCode-specific build/plan shape.

Cursor stores only its three subagent selections, so it needs an agent-only section rather than the common `SimpleConfig` shape. The existing adapter tests use temporary homes and assert exact filesystem output, removal behavior, and preservation of user-created files.

### Cursor Agent and Skill Conventions

Cursor discovers global subagents from `~/.cursor/agents/` and project subagents from `.cursor/agents/`. A subagent is Markdown with YAML frontmatter. Cursor supports `name`, `description`, `model`, `readonly`, and `is_background`; `model` may be `inherit` or a model ID. Project agents take precedence over global agents with the same name.

Atelier's three existing agent templates already provide the required names, descriptions, and instruction bodies:

- `agents/recon.md`
- `agents/oracle.md`
- `agents/architect.md`

Cursor discovers skills from `~/.agents/skills/` and supports compatible Claude and Codex skill locations. No Cursor-specific skill generation is necessary.

### Cursor CLI Configuration

Cursor CLI owns its global configuration and model selection. Its model state is undocumented and version-dependent, so Atelier does not inspect or modify it. Users select the primary Cursor model through Cursor itself; Atelier only writes global Cursor subagent Markdown files.

## Research Findings

1. The requested functionality is one subsystem: a fourth registry adapter. It does not need a new command flow, skill installer, or a separate configuration system.
2. Cursor subagents are the supported way to assign distinct specialized models. The requested defaults map directly to the three existing Atelier templates.
3. Cursor's undocumented native model state is not a safe integration surface. Users retain control of Cursor's primary model.
4. The Cursor adapter needs an agent-only persisted config section and no native config path resolution.
5. Tests and user-visible messages currently assume three harnesses. Registry, command, config, adapter, CLI-help, README, package keywords, and error-message assertions must be updated to recognize Cursor.
