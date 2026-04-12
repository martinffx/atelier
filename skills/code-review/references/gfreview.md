# gfreview Integration

## Installation

https://github.com/martinffx/gfreview

```bash
curl -fsSL https://raw.githubusercontent.com/martinffx/gfreview/main/install.sh | bash
```

## Prerequisites

- gfreview CLI installed
- `GITHUB_TOKEN` or `GITLAB_TOKEN` environment variable set
- `GFREVIEW_FORGE` set (github or gitlab, auto-detected from git remote)
- `GFREVIEW_PROJECT` set (owner/repo, defaults to git remote)

## Commands Used

| Phase | Command |
|-------|---------|
| Check installed | `which gfreview` |
| List PRs | `gfreview list --json --state open` |
| Create PR | `gfreview create --title <t> --source-branch <b> --target-branch <b>` |
| View PR | `gfreview view <id>` |
| Get diff | `gfreview diff <id>` |
| Get discussions | `gfreview discussions <id>` |
| Start review | `gfreview review start <id>` |
| Post comment | `gfreview review comment <id> --file <p> --line <n> --body <t>` |
| Submit review | `gfreview review submit <id> --body <t>` |

## Line-by-Line Comment Posting

Each finding becomes a separate inline comment:

```bash
gfreview review start 42

# Finding 1 - Critical:
gfreview review comment 42 --file src/auth/login.ts --line 45 --body "Blocker: Token stored in localStorage

Access token stored in localStorage is vulnerable to XSS attacks.

Use httpOnly cookies or secure session storage."

# Finding 2 - High:
gfreview review comment 42 --file src/auth/middleware.ts --line 12 --body "Issue: Token validated on every request

This adds 50-200ms latency per request.

Cache validation results or use JWT verification."

gfreview review submit 42 --body "Code review complete. Please address blockers and issues before merging."
```

## Severity Prefix Mapping

| code-review Severity | gfreview Prefix |
|---------------------|-----------------|
| Critical | `Blocker:` |
| High | `Issue:` |
| Medium | `Suggestion:` |
| Low | `Nit:` |

## PR Creation Workflow

```bash
CURRENT_BRANCH=$(git branch --show-current)

# Check if PR exists
PR_NUMBER=$(gfreview list --json --state open | jq -r --arg branch "$CURRENT_BRANCH" \
  '.[] | select(.sourceBranch == $branch) | .number')

if [ -z "$PR_NUMBER" ]; then
  # Push branch
  git push -u origin $CURRENT_BRANCH
  
  # Create PR (targets main by default)
  gfreview create --title "My PR Title" --source-branch $CURRENT_BRANCH --target-branch main
  
  # Get new PR number
  PR_NUMBER=$(gfreview list --json --state open | jq -r --arg branch "$CURRENT_BRANCH" \
    '.[] | select(.sourceBranch == $branch) | .number')
fi

# Post review
gfreview review start $PR_NUMBER
# ... comments ...
gfreview review submit $PR_NUMBER
```

## Line Number Rules

From `gfreview diff <id>` output:
- `-` prefix = added line → use new file line number
- Space prefix = context line → use new file line number

## Error Handling

| Error | Solution |
|-------|----------|
| "Review not started" | Run `gfreview review start <id>` first |
| "Line out of range" | Re-run `gfreview diff <id>` for current line numbers |
| "Permission denied" | Check token has repo scope |
| "Stale review" | Run `gfreview review refresh <id>` or `gfreview review discard <id>` |
