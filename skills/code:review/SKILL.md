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

| Step | Subagent | Parallel | Purpose |
|------|----------|----------|---------|
| 2 | Triage | No | Analyze diff, select reviewers |
| 3 | Reviewers | Yes (per reviewer) | Specialty analysis |
| 4 | Synthesis 1 | No | Deduplicate findings |
| 5 | Challenge | No | Validate findings |

### rs (Respond to Review) Subagents

| Step | Subagent | Parallel | Purpose |
|------|----------|----------|---------|
| 4 | Analysis | Yes (per discussion) | Analyze feedback |
| 5 | Validation | No | Validate fixes |

### Dispatch Patterns

Follows [code:subagents](../code:subagents/SKILL.md) patterns:
- **Parallel dispatch** for independent reviewers/discussions
- **Sequential dispatch** for dependent steps
- **Fresh subagent per task** — no context pollution
- **Error handling**: Log failures, continue with partial results

## Workflow Routing

- `$0` == `rq` or no arguments → [rq.md](./references/rq.md)
- `$0` == `rs` → [rs.md](./references/rs.md)

## Reviewer Pool

See [reviewers.md](./references/reviewers.md)

## Output Format

See [output.md](./output.md)

## gfreview Integration

See [gfreview.md](./references/gfreview.md)
