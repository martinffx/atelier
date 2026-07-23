# Two-tier Planning Workflow

## Problem

Atelier currently treats persisted specifications and structured implementation plans as the default for nearly all non-trivial work. The workflow requires `design.md`, `plan.json`, and tracked tasks even when a concise plan reviewed in conversation would provide enough context and control.

This makes ordinary bounded changes more expensive to plan than necessary. Durable specs remain valuable for substantial work, but they should be reserved for work whose uncertainty, architecture, dependencies, or coordination needs justify those artifacts.

## Scope

**In scope:**

- Introduce two planning modes: Inline Plan and Spec-backed Plan.
- Make Inline Plan the default for bounded, well-understood work.
- Make `spec-orchestrator` the sole automatic classifier of planning mode.
- Let users explicitly override the selected planning mode.
- Add an inline planning path to `spec-plan` using the approved five-section template.
- Allow `spec-implement` and `spec-finish` to operate with either planning mode.
- Preserve the existing spec-backed workflow for substantial work.
- Align workflow skills, repository guidance, agent templates, and subagent guidance with the two-tier model.

**Out of scope:**

- Adding a separate lightweight planning skill.
- Renaming the existing spec workflow skills.
- Rewriting historical specs or plans.
- Updating independently checked-out worktree copies.
- Defining planning mode from file count or estimated duration alone.
- Changing application APIs, persisted application data, or CLI behavior.

## User Stories

### US-1: Default to inline planning

As a developer requesting ordinary bounded work, I want a concise plan in the conversation so that planning remains useful without creating repository artifacts.

- Given work with clear scope, limited uncertainty, and no durable coordination need, when planning starts, then `spec-orchestrator` routes directly to an Inline Plan in `spec-plan`.
- The plan contains `context`, `scope`, `changes`, `files`, and `validation` sections.
- No `design.md`, `plan.json`, epic, or task tracker is created.
- Implementation starts only after the user approves the inline plan.
- Priority: must.

### US-2: Reserve specs for substantial work

As a developer proposing substantial work, I want the full spec workflow so that architectural decisions and dependencies remain durable and reviewable.

- Given broad scope, meaningful uncertainty, architectural decisions, multiple dependent units, or a durable coordination need, when the orchestrator classifies the work, then it routes through `spec-brainstorm -> spec-plan -> spec-implement -> spec-finish`.
- The existing `design.md`, `plan.json`, and structured task behavior remains available.
- Priority: must.

### US-3: Make routing visible and correctable

As a developer, I want to know which planning mode was selected so that I can override an unsuitable classification.

- The orchestrator states `Inline Plan` or `Spec-backed Plan` with one brief reason.
- Explicit user instructions override automatic classification.
- Ambiguous work defaults to inline planning unless a concrete substantial-work signal exists.
- Priority: must.

### US-4: Implement either approved plan

As a developer, I want implementation to accept either planning mode so that inline plans are first-class rather than an incomplete spec workflow.

- `spec-implement` accepts an approved Inline Plan from the conversation or an approved `plan.json`.
- Inline execution does not require Beads or structured task creation.
- Validation remains mandatory in both modes.
- Priority: must.

## Constraints

- Never begin implementation before the user reviews and approves a written plan.
- Inline planning is the default; spec-backed planning requires a concrete substantial-work signal or an explicit user request.
- `spec-orchestrator` owns automatic classification. Downstream skills consume the selected mode instead of reclassifying it.
- A material scope change requires plan revision and renewed approval.
- If inline work develops durable design or coordination needs, stop implementation and return to the orchestrator for promotion to the spec-backed route.
- Preserve the existing spec-backed artifacts and `plan.json` schema.
- Keep the change focused on canonical workflow sources. Do not modify historical artifacts or independent worktrees.

## Context

### Existing workflow

The current canonical flow is:

```text
spec-brainstorm -> design.md -> spec-plan -> plan.json -> spec-implement -> spec-finish
```

The workflow is encoded across the five `spec-*` skills, `AGENTS.md`, `README.md`, the Oracle and Architect agent templates, and the `code-subagents` skill. The current contracts assume persisted artifacts and structured tasks throughout the flow.

### Domain language

An **Inline Plan** is a concise implementation plan reviewed in conversation for bounded, well-understood work. It records context, scope, changes, files, and validation without creating a persisted spec, structured plan, or tracked tasks.

A **Spec-backed Plan** is a persisted implementation plan for substantial work that benefits from durable design decisions, dependency ordering, or coordination. It is derived from an approved `design.md` and recorded in `plan.json` with structured tasks.

These terms are also recorded in `CONTEXT.md`.

## Research Findings

1. The current policy is internally inconsistent. `spec-orchestrator` permits genuinely trivial work to skip the pipeline, while `spec-brainstorm` says every project requires a persisted spec without exception.
2. `spec-plan` has only one planning mode. It requires an approved `design.md`, converts every approved plan into `plan.json`, and creates tracked tasks.
3. The coupling extends beyond `spec-plan`. `spec-brainstorm` always produces `design.md`; `spec-implement` refuses work without both artifacts and tracked tasks; `spec-finish` assumes completion through `spec-implement`.
4. `AGENTS.md` and `README.md` present the artifact-backed sequence as the canonical path. Oracle, Architect, and `code-subagents` also refer unconditionally to persisted artifacts.
5. Existing specs cover substantial, cross-cutting work. They demonstrate the value of durable artifacts without establishing a useful lightweight path for ordinary changes.
6. No automated tests enforce the current artifact policy. The change is primarily to behavioral instructions and documentation. Generated agent content inherits from the canonical templates.

## Architecture

### Workflow routing

```text
Planning request
      |
      v
spec-orchestrator classifies the work
      |
      +-- Inline Plan (default)
      |      spec-plan drafts the plan in conversation
      |      -> user approval
      |      -> spec-implement executes the conversational plan
      |      -> spec-finish validates and completes
      |
      +-- Spec-backed Plan (substantial work)
             spec-brainstorm produces design.md
             -> spec-plan produces plan.json and tracked tasks
             -> user approval
             -> spec-implement executes structured tasks
             -> spec-finish validates and completes
```

### Classification rules

Choose a Spec-backed Plan when at least one concrete signal exists:

- The user explicitly requests a spec or durable planning artifacts.
- Requirements or boundaries need a discovery workshop before implementation can be planned.
- The work introduces or materially changes architecture, public contracts, data models, or cross-system behavior.
- The work contains multiple dependent subsystems that need decomposition and dependency tracking.
- The plan must survive the current conversation for handoff, audit, or multi-person coordination.

Choose an Inline Plan otherwise, including ordinary features, bug fixes, refactors, configuration changes, and multi-file work that is bounded and understood.

File count and estimated duration alone do not make work spec-worthy. When classification remains ambiguous, choose inline planning. The user can override either choice.

### Skill boundaries

- `spec-orchestrator` selects and announces the planning mode with one sentence of reasoning.
- `spec-brainstorm` runs only for the spec-backed route. Its universal-spec rule is removed.
- `spec-plan` supports two explicit modes. Inline mode presents the five-section Markdown plan and stops for approval. Spec-backed mode retains the annotation cycle, `plan.json`, and task creation.
- `spec-implement` accepts either the approved conversational plan or `plan.json`. Tracker and dependency behavior applies only to spec-backed plans.
- `spec-finish` validates either route without requiring structured tasks for inline work.
- `code-subagents` remains primarily spec-backed. Inline work may use subagents only when the full approved Inline Plan is supplied as task context.
- `README.md`, `AGENTS.md`, Oracle, and Architect guidance describe both routes and no longer treat persisted artifacts as universal.

### State and ownership

An Inline Plan exists only in the active conversation. Approval is the user's explicit response to that plan. Material scope changes require revision and renewed approval.

If implementation reveals a need for durable design or substantial unresolved decisions, execution stops and returns to `spec-orchestrator` for promotion to the spec-backed route.

## Plan Contracts

### Inline Plan

Input:

- A bounded implementation request.
- Enough codebase context to identify scope, files, and validation.

Output:

```markdown
# context

## scope

# changes

## files

# validation
```

Content rules:

- `context`: current behavior, relevant constraints, and why the change is needed.
- `scope`: explicit in-scope and out-of-scope boundaries.
- `changes`: ordered implementation changes at useful engineering granularity.
- `files`: exact files expected to be created, modified, or deleted.
- `validation`: concrete tests, checks, or manual verification.
- Keep the plan proportional. Do not manufacture phases, task IDs, dependencies, acceptance matrices, or tracker entries.
- Stop after presenting the plan. Implementation requires explicit approval.

### Spec-backed Plan

Input:

- An approved `design.md` from `spec-brainstorm`.

Output:

- The existing `plan.json` schema.
- Structured task tracking when useful for executing the substantial work.
- The existing annotation and approval cycle.

### Implementation handoff

- Inline route: `spec-implement` receives the approved conversational plan and executes its `changes`, respecting `scope`, `files`, and `validation`.
- Spec-backed route: `spec-implement` receives `plan.json` and follows task dependencies and tracking.
- Both routes remain plan-first, test-aware, reviewable, and validation-driven.
- A material plan change requires user approval before execution continues.

## API Design

No application API changes. The contracts changed by this work are the skill inputs, outputs, prerequisites, and handoffs described above.

## Data Model

No application data-model or migration changes. `design.md` and `plan.json` remain the persisted artifacts for the spec-backed route; the Inline Plan is intentionally conversational and ephemeral.

## Files to Modify

Primary workflow policy:

- `skills/spec-orchestrator/SKILL.md`
- `skills/spec-brainstorm/SKILL.md`
- `skills/spec-plan/SKILL.md`
- `skills/spec-implement/SKILL.md`
- `skills/spec-finish/SKILL.md`
- `AGENTS.md`
- `README.md`

Supporting contracts:

- `agents/oracle.md`
- `agents/architect.md`
- `skills/code-subagents/SKILL.md`
- `skills/code-subagents/references/implementor-prompt.md`
- `skills/code-subagents/references/spec-reviewer-prompt.md`
- `CONTEXT.md`

Historical specs and independently checked-out worktree copies are not modified.

## Trade-offs

### Chosen: orchestrator-owned two-tier routing

- Planning mode is selected once, before artifact-producing skills run.
- Inline planning becomes the default rather than an exception for trivial work.
- The substantial workflow keeps durable artifacts where their coordination value justifies the cost.
- User overrides remain authoritative.

### Classification is judgment-based

Concrete signals and inline-by-default behavior reduce inconsistent routing without pretending file counts or estimates define substantial work. Different agents may still classify edge cases differently, and the visible reason plus user override provides the correction mechanism.

### Inline plans are ephemeral

Inline plans are faster and less intrusive, but weaker for handoff, audit, or context recovery. Those needs are explicit reasons to choose or promote to a Spec-backed Plan.

### `spec-plan` has a broader contract

Keeping both output forms in one planning skill avoids adding another skill and preserves a single place for plan quality rules, at the cost of making the skill mode-aware.

### Coordinated policy changes are necessary

Updating only `spec-plan` would leave contradictory prerequisites and handoffs throughout the workflow. The wider documentation change is justified because it keeps one coherent planning model.

## Known Limitations

An approved Inline Plan depends on the active conversation. If that context is unavailable or reliable handoff becomes necessary, the work must be replanned as spec-backed rather than reconstructing approval implicitly.

## Open Questions

None. The planning modes, default, classification ownership, override behavior, templates, artifacts, and handoffs are resolved.

## Success Criteria

- Ordinary bounded work routes to an Inline Plan by default.
- Substantial work with concrete spec signals routes through `spec-brainstorm`.
- The selected route and reason are visible and user-overridable.
- The Inline Plan uses the approved five-section template and creates no repository planning artifacts or tracker entries.
- Both routes require explicit plan approval before implementation.
- `spec-implement` and `spec-finish` accept either route without contradictory prerequisites.
- Canonical workflow documentation and agent guidance describe the same two-tier model.
- Existing spec-backed behavior and `plan.json` structure remain available.
