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

### rq (Request Review) Subagents

| Step | Subagent | Uses | Parallel | Purpose |
|------|----------|------|----------|---------|
| 1 | Triage | `clerk` agent (minimax-m2.5) | No | Detect context, select reviewers, identify skills to load |
| 2 | Reviewers | `general` subagent | Yes (per reviewer) | Specialty analysis (loads detected skills) |
| 3 | Synthesis | `general` subagent | No | Deduplicate findings |
| 4 | Architect | `architect` agent (kimi-k2.5) | No | Architecture review |
| 5 | Challenge | `oracle` agent (glm-5) | No | Validate findings with sequential-thinking |

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

| Agent | Model | Used In Step |
|-------|-------|--------------|
| `clerk` | minimax-m2.5 | Triage (context retrieval, file analysis) |
| `architect` | kimi-k2.5 | Architect (architecture review) |
| `oracle` | glm-5 | Challenge (validate findings, sequential-thinking) |
| `general` | (varies) | Reviewers, Synthesis |

See [agents/](../agents/) for agent definitions.

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
