---
name: code-pull-request
description: >
  Create GitHub pull requests with readiness checks and structured PR bodies generated
  from conventional commits (with diff-based fallback). Use whenever the user wants to
  open a PR, create a pull request, push a feature branch for review, says "make a PR",
  "open a PR", "submit a PR", or after finishing implementation work. Triggers on
  "pull request", "PR", "gh pr create", "open a PR", or when a feature branch is
  ready for review. Make sure to use this skill whenever PR creation is mentioned,
  even if the user doesn't explicitly ask for a "pull request" — phrases like
  "ship this", "submit this for review", or "send this upstream" should trigger too.
user-invocable: true
---

# Pull Request Skill

Create GitHub pull requests that are ready for review: verify readiness, generate a
structured PR body, then open the PR via `gh`.

This skill is **create-only** (v1). It does not update existing PRs, monitor CI, or
respond to review feedback. After the PR is open, hand control back to the human.

## Prerequisites

Before doing anything, verify the environment is ready:

```bash
gh auth status                 # gh CLI installed and authenticated
git remote -v                 # origin points to GitHub
git branch --show-current     # currently on a feature branch (not main)
```

If any of these fail, stop and tell the human what's missing — do not attempt to fix
auth, remotes, or branch state automatically. PR creation from `main` is almost always
a mistake, so refuse and ask the human to switch branches first.

---

## Step 1: Readiness Checks

A PR that fails tests or linters wastes reviewer time. Run the project's quality gates
before opening the PR. The goal is to never open a PR with red checks.

### Working Tree

```bash
git status --short
```

The working tree should be clean (committed or stashed). If there are unstaged changes,
ask the human whether to commit them (invoke [code-commit](../code-commit/SKILL.md))
or stash before proceeding.

### Branch Sync

```bash
git fetch origin
git log --oneline origin/<base>..HEAD
```

If the branch is behind the base, rebase or merge before creating the PR. Tell the
human what's out of sync and let them choose.

### Quality Gates

Detect the project's toolchain and run the appropriate commands. Common signals:

| Stack | Test | Typecheck | Lint | Build |
|-------|------|-----------|------|-------|
| Node/TS | `npm test` / `bun test` | `npm run typecheck` / `tsc --noEmit` | `npm run lint` / `biome check` | `npm run build` |
| Python | `pytest` / `uv run pytest` | `mypy` / `basedpyright` | `ruff check .` | — |
| Rust | `cargo test` | `cargo check` | `cargo clippy` | `cargo build` |
| Go | `go test ./...` | `go vet ./...` | `golangci-lint run` | `go build ./...` |

Look for clues: `package.json` scripts, `pyproject.toml`, `Cargo.toml`, `go.mod`,
`Makefile`, or a `mise.toml` / `.tool-versions` file. If you can't determine the
toolchain confidently, ask the human what command to run — do not guess.

**If any gate fails:** stop. Show the failing output and ask the human to fix it before
re-running. Do not open a PR with broken checks.

**If all pass:** proceed to body generation.

---

## Step 2: Generate the PR Body

A good PR body tells reviewers *what changed and why* without forcing them to read the
diff. The body is generated from the project's PR template if one exists, otherwise
from a structured synthesis of the commits and diff.

### Template Discovery

```bash
ls .github/PULL_REQUEST_TEMPLATE.md 2>/dev/null
ls .github/PULL_REQUEST_TEMPLATE/*.md 2>/dev/null
ls docs/PULL_REQUEST_TEMPLATE.md 2>/dev/null
ls PULL_REQUEST_TEMPLATE.md 2>/dev/null
```

**If a template exists:** use it. `gh pr create` will pick it up automatically in
interactive mode. For inline mode, fill in each section of the template based on the
commits and diff.

**If no template:** use the fallback body structure below.

### Body Source Priority

Generate the body in this order, falling back when a source is unavailable:

1. **Conventional commit messages** (preferred) — parse the commit log between the
   base branch and HEAD. Conventional commits (`feat(auth): ...`, `fix(api): ...`)
   already encode the type and scope, which maps cleanly to PR sections.
2. **Diff synthesis** (fallback) — if commits are messy, non-conventional, or
   squash-style with no useful message, analyze `git diff origin/<base>...HEAD` to
   reconstruct what changed.

### Synthesis Process

```bash
git log --oneline origin/<base>..HEAD           # commit list
git log origin/<base>..HEAD --format='%H %s%n%b'  # full commit messages
git diff --stat origin/<base>...HEAD            # changed files summary
```

From the commits (or diff), extract:

- **Summary**: one or two sentences describing what the PR does overall. Lead with
  the *why* — the problem being solved or the feature being added — not the *how*.
- **Changes**: bulleted list of concrete changes, grouped logically (e.g., "API",
  "Database", "Tests"). Each bullet should be reviewable on its own.
- **Testing**: how the changes were verified. Reference the test commands from
  Step 1 and note any manual testing performed.
- **Checklist**: standard items (tests pass, conventional commits, docs updated).
- **Linked issues**: extract `Closes #N`, `Fixes #N`, or `Relates to #N` from
  commit footers and surface them in the body. These auto-close issues on merge.

### Fallback Body Template

```markdown
## Summary
<!-- One or two sentences: what and why -->

## Changes
<!-- Bulleted, grouped by area. Each bullet self-contained. -->
-

## Testing
<!-- How it was verified: test commands run, manual steps, edge cases checked -->

## Checklist
- [ ] Tests pass
- [ ] Commits follow conventional format
- [ ] Documentation updated (if needed)

## Linked Issues
<!-- Closes #123, Fixes #456, Relates to #789 -->
```

### PR Title

Derive from the most significant conventional commit, or synthesize from the summary:

```
<type>(<scope>): <description>
```

Examples:
- `feat(auth): add JWT token refresh`
- `fix(db): resolve connection pool leak`
- `refactor(api): extract validation middleware`

If the branch is a single-concern feature branch, the title usually matches the
primary commit's subject. If multiple concerns, pick the dominant one and mention
the rest in the body.

---

## Step 3: Create the PR

Show the human the generated title and body **before** creating the PR. Ask for
confirmation, or for "just do it" / "skip confirm" instructions up front.

### Creation Modes

| Mode | Command | When to use |
|------|---------|-------------|
| Auto-fill | `gh pr create --fill` | Commits are clean and conventional; `--fill` uses commit messages for title/body |
| Inline | `gh pr create --title "<title>" --body "<body>"` | Body is fully generated; fastest path |
| Interactive | `gh pr create` | Human wants to edit the body in their editor; template auto-applied |
| Draft | `gh pr create --draft --title "<title>" --body "<body>"` | Work in progress; not ready for merge but visible |

**Default to inline mode** with the generated body — it's the fastest path that still
produces a high-quality PR. Fall back to `--fill` only when the commits are clean
enough that the body would be redundant. Use `--draft` when the human signals the
work is incomplete (e.g., "draft PR", "WIP", "not ready yet").

### Branch Push

If the branch isn't pushed yet, `gh pr create` will prompt to push. To push
explicitly first:

```bash
git push -u origin <branch-name>
```

### After Creation

```bash
gh pr view --web    # open the PR in the browser
gh pr status        # show current PR status
```

Show the human the PR URL returned by `gh pr create`. Hand control back to them —
this skill does not monitor CI, request reviewers, or respond to feedback.

---

## When NOT to Use

- **Implementation still in progress** → use `spec-implement` to finish the work first
- **Quality gates failing** → fix in `spec-implement` or directly before opening the PR
- **Want to update an existing PR** → out of scope for v1; use `gh` directly
- **Want to monitor CI or respond to review comments** → out of scope for v1
- **Just want to commit, not open a PR** → use [code-commit](../code-commit/SKILL.md)
- **Need a code review of the diff first** → use [code-review](../code-review/SKILL.md)

---

## Integration

This skill coordinates with:

- **[code-commit](../code-commit/SKILL.md)** — generates the conventional commits this
  skill parses for the PR body. If commits are messy, this skill falls back to diff
  synthesis.
- **[code-review](../code-review/SKILL.md)** — optional pre-PR review of the diff.
  Run `code-review` before this skill if the human wants critique before opening the PR.
- **[spec-finish](../spec-finish/SKILL.md)** — the spec workflow's finish step invokes
  this skill as its final action to open the PR.

---

## Examples

**Example 1: Clean conventional commits**

Branch `feat/jwt-refresh` has 3 commits:
```
feat(auth): add token refresh endpoint
test(auth): cover refresh flow
docs(api): document refresh endpoint
```

Generated PR:
- **Title**: `feat(auth): add token refresh endpoint`
- **Body**: Summary describes the refresh feature; Changes lists the endpoint, tests,
  and docs; Testing references `pytest -k auth`; Checklist complete.

**Example 2: Messy commits, diff fallback**

Branch `misc-fixes` has commits like `stuff`, `fix`, `wip`. The skill falls back to
`git diff` to reconstruct changes: "Fixed null pointer in user service, added input
validation to checkout endpoint, updated error responses". Synthesizes a structured
body and a title like `fix(api): resolve null pointer and validation gaps`.

**Example 3: Draft PR**

Human says "open a draft PR, still WIP". Skill runs readiness checks (skipping
strict gate enforcement if the human acknowledges failing tests), generates a body
from commits, and runs `gh pr create --draft --title ... --body ...`.

**Example 4: Project template**

`.github/PULL_REQUEST_TEMPLATE.md` exists with sections `## What`, `## Why`, `## How`,
`## Testing`. Skill fills each section from commits/diff instead of using the
fallback template.
