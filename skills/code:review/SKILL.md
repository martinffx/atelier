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

## Workflow Routing

- `$0` == `rq` or no arguments → [rq.md](./references/rq.md)
- `$0` == `rs` → [rs.md](./references/rs.md)

## Reviewer Pool

See [reviewers.md](./references/reviewers.md)

## Output Format

See [output.md](./references/output.md)

## gfreview Integration

See [gfreview.md](./references/gfreview.md)
