# Workflow: Create PR/MR

Create a pull request (GitHub) or merge request (GitLab) for the current branch.

Start with [common.md](common.md) (platform detection, base branch, preflight).

---

## Step 1: Check for Existing PR/MR

GitHub:
```bash
gh pr view --json state,number,url
```

GitLab:
```bash
glab mr view --output json
```

- **Open** → show the URL, stop. Don't create a duplicate.
- **Closed/merged** → check for new commits since the PR was closed:
  ```bash
  git log --oneline <remote>/<base>..HEAD
  ```
  New commits exist → proceed to create a new PR.
  No new commits → tell the human, stop.
- **None** → proceed to create.

---

## Step 2: Find a Template

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
  [default-template.md](default-template.md).

---

## Step 3: Generate Title and Body

```bash
git log --oneline <remote>/<base>..HEAD            # commit list
git log <remote>/<base>..HEAD --format='%H %s%n%b' # full commit messages
git diff --stat <remote>/<base>...HEAD             # changed files summary
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

## Step 4: Create the PR

Show the human the selected remote, branch, generated title, and body before any write. Ask for
approval to push and create the PR/MR, or proceed if they explicitly said "just do it" up front.

Push the branch only after that approval if it is not on the remote:

```bash
git push -u <remote> <branch-name>
```

### GitHub

| Mode | Command |
|------|---------|
| Auto-fill | `gh pr create --fill` |
| Inline | `gh pr create --title "<title>" --body-file -` (body via stdin) |
| Draft | `gh pr create --draft --title "<title>" --body-file -` (body via stdin) |

### GitLab

| Mode | Command |
|------|---------|
| Auto-fill | `glab mr create --fill` |
| Inline | Invoke `glab mr create` with title and description passed as separate arguments by the active command runner. |
| Draft | Invoke `glab mr create --draft` with title and description passed as separate arguments by the active command runner. |

Default to inline with the generated body. **Never pass a multi-line body directly
in the command string** (`--body "<body>"`) — quotes, backticks, and `$` in
Markdown break shell quoting. Write the body to a temp file first, then pass it
via stdin (`gh --body-file -`). For GitLab, use the active command runner's argument array rather
than constructing a shell command; never interpolate the body through command substitution.

Use `--fill` when commits are clean and the body would be redundant. Use `--draft`
when the human signals work in progress.

After creation, show the PR/MR URL to the human. Done.
