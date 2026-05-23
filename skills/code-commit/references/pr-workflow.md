# Pull Request Workflow

Creating GitHub pull requests via the `gh` CLI.

## Prerequisites

- `gh` CLI installed and authenticated: `gh auth status`
- Remote `origin` points to GitHub: `git remote -v`
- On a feature branch (not main): `git branch --show-current`

## Check for Project Template

Before creating a PR, check if the project has its own PR template:

```bash
# Check for PR template in .github/
ls .github/PULL_REQUEST_TEMPLATE.md 2>/dev/null || echo "No project template found"
```

**If found:** Use it. The `gh pr create` command will automatically pick it up.

**If not found:** Use the minimal template below.

---

## Create Pull Request

### Option 1: Auto-fill from commits (recommended)

```bash
gh pr create --fill
```

This uses the commit messages as the PR title and body. Best when commits are clean and conventional.

### Option 2: Interactive

```bash
gh pr create
```

Opens an editor with the template. Fill in title and body interactively.

### Option 3: Inline (for simple PRs)

```bash
gh pr create --title "feat(auth): add JWT authentication" --body "Implements token-based auth with refresh support."
```

---

## PR Title Format

Follow conventional commit style for PR titles:

```
<type>(<scope>): <description>
```

Examples:
- `feat(api): add user profile endpoint`
- `fix(db): resolve connection pool leak`
- `docs(readme): update installation instructions`

---

## PR Body Template (fallback if no project template)

```markdown
## Description
<!-- What does this PR do? -->

## Changes
<!-- What changed? -->

## Testing
<!-- How was this tested? -->

## Checklist
- [ ] Tests pass
- [ ] Commits follow conventional format
- [ ] Documentation updated (if needed)
```

---

## Linking Issues

Add issue references in the PR body:

```markdown
Closes #123
Fixes #456
Relates to #789
```

This auto-closes linked issues when the PR merges.

---

## Draft PRs

For work-in-progress PRs:

```bash
gh pr create --draft
```

Mark as ready later:

```bash
gh pr ready <pr-number>
```

---

## Review Requests

Request reviewers after creating the PR:

```bash
gh pr edit <pr-number> --add-reviewer username
```

Or add via the GitHub web UI.

---

## Verify PR Created

```bash
gh pr view --web  # Open in browser
gh pr status      # Show PR status
```

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| PR from main branch | Switch to feature branch first |
| No remote | `git remote add origin <url>` |
| Unpushed commits | `git push -u origin <branch>` |
| PR body is empty | Use `--fill` or write a description |
