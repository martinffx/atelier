---
name: code-review
description: Multi-agent code review with parallel specialized reviewers, architecture validation, and challenge validation. Use `rq` to request a review of diffs (defaults to main branch), `rs` to respond to review findings. Triggers on "review this", "review my code", "code review", "check for bugs", "audit this", when examining PRs, pull requests, branches, or diffs. Always asks user before applying fixes.
argument-hint: "rq [branch] | rs"
user-invocable: true
---

# Code Review Skill

Multi-agent code analysis with parallel reviewers and challenge validation.

Uses explicit subagent dispatch patterns from [code-subagents](../code-subagents/SKILL.md).

## Prerequisites

- **Required**: git

## Arguments

### Command Routing

| Invocation | Behavior |
|------------|----------|
| *(no arguments)* | Review diff to main branch |
| `rq` | Review diff to main branch |
| `rq main` | Review diff to main branch |
| `rq develop` | Review diff to develop branch |
| `feat/foo` | Review diff to feat/foo (bare branch = rq) |
| `rs` | Respond to review findings (interview mode) |

## Subagent Architecture

Use these concrete harness subagent types. If an exact match is unavailable, use the most correct available subagent based on the harness-provided descriptions.

| `subagent_type` | Purpose |
|-----------------|---------|
| `recon` | Triage only: changed-file analysis, context retrieval, reviewer selection |
| `oracle` | Parallel reviewer personas, evidence-based critique, failure-mode analysis, challenge validation |
| `architect` | Architecture, design-boundary, data-model, and API-contract review |

Reviewer names such as `Security`, `Correctness`, `Maintainability`, and `PerformanceOperator` are prompt personas, not subagent types. Do not use `general`; it is not a harness agent.

### rq (Request Review) Subagents

| Step | Parallel | Purpose |
|------|----------|---------|
| 1. Triage | No | Detect context, select reviewers, identify skills to load |
| 2. Reviewers | Yes (per reviewer) | Specialty analysis using reviewer personas |
| 3. Synthesis | No | Deduplicate findings inline |
| 4. Architect | No | Architecture review |
| 5. Challenge | No | Validate findings with sequential-thinking |

### rs (Respond to Review)

No subagents. Interactive interview mode — see [rs.md](./references/rs.md).

## Dispatch Patterns

Follows [code-subagents](../code-subagents/SKILL.md) patterns:
- **Parallel dispatch** for independent reviewers
- **Sequential dispatch** for dependent steps
- **Fresh subagent per task** — no context pollution
- **Skill loading pre-step** before each analysis phase
- **Error handling**: Log failures, continue with partial results

## Agent Dispatch

| Agent | Used In Step |
|-------|--------------|
| `recon` | Triage only (context retrieval, file analysis) |
| `oracle` | Reviewers and challenge validation |
| `architect` | Architect (architecture review) |

Synthesis is performed inline by the main agent.

## References

| Reference | Purpose |
|-----------|---------|
| [rq.md](./references/rq.md) | Request review workflow - detailed steps with prompts |
| [rs.md](./references/rs.md) | Respond to review workflow - interview mode |
| [reviewers.md](./references/reviewers.md) | Reviewer definitions and prompts |
| [output.md](./references/output.md) | Output format specification |
## Workflow Routing

- No arguments, `rq`, or bare branch → [rq.md](./references/rq.md)
- `rs` → [rs.md](./references/rs.md)
