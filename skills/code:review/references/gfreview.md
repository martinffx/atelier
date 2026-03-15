# gfreview Integration

## Prerequisites

- gfreview CLI installed
- `GFREVIEW_TOKEN` environment variable set
- `GFREVIEW_FORGE` set (github or gitlab)
- `GFREVIEW_PROJECT` set (owner/repo or group/project)

## Commands Used

| Phase | Command |
|-------|---------|
| View PR | `gfreview view <id>` |
| Get diff | `gfreview diff <id>` |
| Get discussions | `gfreview discussions <id>` |
| Start review | `gfreview review start <id>` |
| Post comment | `gfreview review comment <id> --file <path> --line <n> --body <text>` |
| Submit review | `gfreview review submit <id>` |

## Severity Prefix Mapping

| code:review Severity | gfreview Prefix |
|---------------------|-----------------|
| Critical | `Blocker:` |
| High | `Issue:` |
| Medium | `Suggestion:` |
| Low | `Nit:` |

## Posting Findings

After review completes, ask user: "Post findings to PR via gfreview? [y/N]"

If yes:

```bash
# Start review session
gfreview review start <id>

# Post each finding as inline comment
gfreview review comment <id> --file <path> --line <n> --body "<prefix>: <message>

<extended_reasoning>"

# Submit review
gfreview review submit <id>
```

## Line Number Rules

Use line numbers from `gfreview diff <id>` output:
- `-` prefix = added line, use new file line number
- Context lines use new file line number

## Finding PR for Current Branch

```bash
gh pr list --head $(git branch --show-current) --json number --jq '.[0].number'
```

## Error Handling

| Error | Solution |
|-------|----------|
| "Review not started" | Run `gfreview review start <id>` first |
| "Line out of range" | Re-run `gfreview diff <id>` for current line numbers |
| "Permission denied" | Check token has repo scope |
| "Stale review" | Run `gfreview review refresh <id>` or `gfreview review discard <id>` |

## Multi-line Comments

For commenting on a range of lines:

```bash
gfreview review comment <id> --file <path> --line-start <n> --line-end <m> --body <text>
```

## Reading Body from File

For long comments:

```bash
gfreview review comment <id> --file <path> --line <n> --body @/path/to/comment.md
```

Or from stdin:

```bash
echo "Multi-line comment" | gfreview review comment <id> --file <path> --line <n> --body -
```
