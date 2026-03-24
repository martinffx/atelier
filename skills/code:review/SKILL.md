---
name: code:review
description: Multi-agent code review. Use `rq` to request review,
  `rs` to respond to feedback. Triggers on "review this",
  "code review", "check for bugs".
argument-hint: <rq|rs> <branch|PR>
user-invocable: true
---

# Code Review Skill

Multi-agent code analysis with parallel reviewers and challenge validation.

Uses explicit subagent dispatch patterns from [code:subagents](../code:subagents/SKILL.md).

## Prerequisites

### rq (Request Review)
- **Required**: git
- **Optional**: gfreview — enables PR integration and line-by-line comments
- **Optional**: gh — for additional PR management

### rs (Respond to Review)
- **Required**: gfreview — install from https://github.com/martinffx/gfreview
- **Required**: git

If gfreview is not installed for rs:
> **Error: rs requires gfreview.**
>
> Install from: https://github.com/martinffx/gfreview
>
> ```bash
> curl -fsSL https://raw.githubusercontent.com/martinffx/gfreview/main/install.sh | bash
> ```

## Arguments

$0 = command (rq or rs)
$1 = target (branch or PR number)

### Argument Parsing

| Invocation | Behavior |
|------------|----------|
| `rq` | Review diff to main branch |
| `rq develop` | Review diff to develop branch |
| `rq 42` | Requires gfreview — review PR #42 |
| `rs` | Requires gfreview — find PR for current branch |
| `rs 42` | Requires gfreview — respond to PR #42 |

### Finding PR for Current Branch

```bash
gh pr list --head $(git branch --show-current) --json number --jq '.[0].number'
```

## Subagent Architecture

### rq (Request Review) Subagents

| Step | Subagent | Uses | Parallel | Purpose |
|------|----------|------|----------|---------|
| 1 | Triage | `clerk` agent (minimax-m2.5) | No | Detect context, select reviewers, identify skills to load |
| 2 | Reviewers | `general` subagent | Yes (per reviewer) | Specialty analysis (loads detected skills) |
| 3 | Synthesis | `general` subagent | No | Deduplicate findings |
| 4 | Architect | `architect` agent (kimi-k2.5) | No | Architecture review |
| 5 | Challenge | `oracle` agent (glm-5) | No | Validate findings with sequential-thinking |

### rs (Respond to Review) Subagents

| Step | Subagent | Uses | Parallel | Purpose |
|------|----------|------|----------|---------|
| 1 | Analysis | `general` subagent | Yes (per discussion) | Analyze feedback (loads relevant skills) |
| 2 | Validation | `general` subagent | No | Validate suggested fixes |

## Dispatch Patterns

Follows [code:subagents](../code:subagents/SKILL.md) patterns:
- **Parallel dispatch** for independent reviewers/discussions
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
| `general` | (varies) | Reviewers, Synthesis, Validation |

See [agents/](../agents/) for agent definitions.

## gfreview Integration

When gfreview is installed:

### rq (Request Review)
- Check if PR exists: `gfreview list --json --state open`
- If PR exists: post findings as line-by-line comments
- If no PR: offer to push branch, create PR, and post findings

### rs (Respond to Review)
- Fetch comments: `gfreview discussions <id>`
- Analyze and plan fixes
- **Always ask user** before applying fixes or posting responses

Each finding posted as inline comment with severity prefix:
- Critical → `Blocker:`
- High → `Issue:`
- Medium → `Suggestion:`
- Low → `Nit:`

See [gfreview.md](./references/gfreview.md) for detailed command reference.

## References

| Reference | Purpose |
|-----------|---------|
| [rq.md](./references/rq.md) | Request review workflow - detailed steps with prompts |
| [rs.md](./references/rs.md) | Respond to review workflow - detailed steps with prompts |
| [reviewers.md](./references/reviewers.md) | Reviewer definitions and prompts |
| [output.md](./references/output.md) | Output format specification |
| [gfreview.md](./references/gfreview.md) | gfreview CLI integration |
| [context-flow.md](./references/context-flow.md) | Data flow between workflow steps |

## Workflow Routing

- `$0` == `rq` or no arguments → [rq.md](./references/rq.md)
- `$0` == `rs` → [rs.md](./references/rs.md)
