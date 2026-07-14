---
name: code-pull-request
description: >
  Create GitHub pull requests or GitLab merge requests using gh or glab. Triggers on
  "open a PR", "make a PR", "submit for review", "ship this", or when a feature branch
  is ready for review.
user-invocable: true
---

# Pull Request Skill

Create a pull request (GitHub) or merge request (GitLab) for the current branch.
Assumes the relevant CLI (`gh` or `glab`) is installed and authenticated.

This skill is **create-only**. It does not update existing PRs, monitor CI, or
respond to review feedback.

---

## Step 1: Detect Platform and Base Branch

```bash
git remote get-url origin
```

- Contains `github.com` → use `gh` (GitHub PR)
- Contains `gitlab` → use `glab` (GitLab MR)

Determine the base branch:

```bash
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo main
```

If that fails, ask the human what the base branch is.

Refuse to create a PR from the default branch — that's almost always a mistake.
Ask the human to switch to a feature branch first.

---

## Step 2: Check for Existing PR

GitHub:
```bash
gh pr view --json state,number,url
```

GitLab:
```bash
glab mr view --json state,iid,web_url
```

- **Open** → show the URL, stop. Don't create a duplicate.
- **Closed/merged** → check for new commits since the PR was closed:
  ```bash
  git log --oneline origin/<base>..HEAD
  ```
  New commits exist → proceed to create a new PR.
  No new commits → tell the human, stop.
- **None** → proceed to create.

---

## Step 3: Find a Template

Look for the repo's PR/MR template:

GitHub:
```bash
ls .github/PULL_REQUEST_TEMPLATE.md 2>/dev/null
ls .github/PULL_REQUEST_TEMPLATE/*.md 2>/dev/null
```

GitLab:
```bash
ls .gitlab/merge_request_templates/*.md 2>/dev/null
ls .gitlab/merge_request_template.md 2>/dev/null
```

Also check common locations:
```bash
ls docs/PULL_REQUEST_TEMPLATE.md 2>/dev/null
ls PULL_REQUEST_TEMPLATE.md 2>/dev/null
```

- **Template found** → use it. The CLI will auto-apply it in interactive mode, or
  fill each section from the commits and diff for inline mode.
- **No template** → use the fallback template at
  [references/default-template.md](references/default-template.md).

---

## Step 4: Generate Title and Body

```bash
git log --oneline origin/<base>..HEAD            # commit list
git log origin/<base>..HEAD --format='%H %s%n%b'  # full commit messages
git diff --stat origin/<base>...HEAD             # changed files summary
```

Derive the title from the most significant conventional commit. If commits are
messy, synthesize from the diff:

```
<type>(<scope>): <description>
```

Fill the body (template sections or fallback) from the commits and diff:
- **Summary** — what and why, one or two sentences
- **Changes** — bulleted, grouped by area
- **Testing** — how it was verified (if known)
- **Checklist** — tests pass, conventional commits, docs updated
- **Linked issues** — extract `Closes #N`, `Fixes #N`, `Relates to #N` from commit
  footers

---

## Step 5: Create the PR

Push the branch first if it isn't on the remote:

```bash
git push -u origin <branch-name>
```

Show the human the generated title and body before creating. Ask for confirmation,
or proceed if they said "just do it" up front.

### GitHub

| Mode | Command |
|------|---------|
| Auto-fill | `gh pr create --fill` |
| Inline | `gh pr create --title "<title>" --body "<body>"` |
| Draft | `gh pr create --draft --title "<title>" --body "<body>"` |

### GitLab

| Mode | Command |
|------|---------|
| Auto-fill | `glab mr create --fill` |
| Inline | `glab mr create --title "<title>" --description "<body>"` |
| Draft | `glab mr create --draft --title "<title>" --description "<body>"` |

Default to inline with the generated body. Use `--fill` when commits are clean and
the body would be redundant. Use `--draft` when the human signals work in progress.

After creation, show the PR/MR URL to the human. Done.
