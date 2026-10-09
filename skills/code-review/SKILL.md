---
name: code-review
description: Multi-agent code review with parallel specialized reviewers, architecture validation, challenge validation, and durable handling of previously decided findings. Use `rq` to request a review of diffs (defaults to main branch), `rs` to respond to findings and record intentional non-fix decisions beside the relevant code. Triggers on "review this", "review my code", "code review", "check for bugs", "audit this", when examining PRs, pull requests, branches, or diffs. Always asks user before applying fixes or adding decision comments.
argument-hint: "rq [branch] | rs"
user-invocable: true
---

# Code Review Skill

Multi-agent code analysis with a simplicity gate, focused reviewers, and challenge validation.

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

## Agent Selection

Dispatch each step as a subagent, but never name a specific agent. The harness chooses the
available agent whose description best fits the step's task. Steps and the kind of work they
need:

| Step | Kind of work |
|------|--------------|
| Triage | Read-only recon: changed-file analysis, context retrieval, reviewer selection |
| Reviewers | Critical analysis: evidence-based critique and failure-mode analysis |
| Architect | Architecture, design-boundary, data-model, and API-contract review |
| Challenge | Critical analysis: validate or reject findings |

Reviewer names such as `Security`, `Correctness`, `Maintainability`, and `PerformanceOperator` are prompt personas, not agent types.

`Simplicity` is a mandatory reviewer persona for migrations, refactors, and architectural
changes. Run it before the other reviewers; do not include it in the parallel reviewer batch.

## Review Priority

Review in this order:

1. User goal and prior behavior
2. Necessity and deletion
3. Correctness and security
4. Architecture
5. SDD compliance

Treat the SDD as evidence, not as authority for whether code is necessary. A finding that
would expand behavior or infrastructure requires user approval. Never apply it as an ordinary
review fix.

### rq (Request Review) Subagents

| Step | Parallel | Purpose |
|------|----------|---------|
| 1. Triage | No | Detect context, select reviewers, identify relevant skills to look for |
| 2. Simplicity | No | Mandatory necessity and deletion review for migrations, refactors, and architectural changes |
| 3. Reviewers | Yes (per reviewer) | Correctness, security, and other specialty analysis |
| 4. Synthesis | No | Deduplicate findings inline |
| 5. Architect | No | Architecture review |
| 6. SDD + Challenge | No | Check SDD compliance last, then validate findings |

### rs (Respond to Review)

No subagents. Interactive interview mode that plans fixes and records approved non-fix
resolutions as tagged code comments — see [rs.md](./references/rs.md).

## Dispatch Patterns

Follows [code-subagents](../code-subagents/SKILL.md) patterns:
- **Parallel dispatch** for independent reviewers
- **Sequential dispatch** for dependent steps
- **Fresh subagent per task** — no context pollution
- **Relevant skill search pre-step** before each analysis phase
- **Error handling**: Log failures, continue with partial results

## Agent Dispatch

Every step except synthesis and output uses a harness-selected agent (see Agent Selection).

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
