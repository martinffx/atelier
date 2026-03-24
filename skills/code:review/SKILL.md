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

## Arguments

$0 = command (rq or rs)
$1 = target (branch or PR number)

### Argument Parsing

| Invocation | Parsed As |
|------------|-----------|  
| (no args) | `rq main` |
| `rq` | `rq main` |
| `rq develop` | `rq develop` |
| `rq 42` | `rq 42` |
| `rs` | `rs <find PR for current branch>` |
| `rs 42` | `rs 42` |

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
