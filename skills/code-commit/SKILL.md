---
name: code-commit
description: Generate and validate conventional commit messages following the conventionalcommits.org spec. Use whenever the user wants to commit code, mentions commit messages, git commit, or asks to create a commit. Triggers on "commit", "git commit", "conventional", or when reviewing commit message format.
user-invocable: true
---

# Conventional Commit Skill

Create coherent, reviewable commits that follow the
[Conventional Commits](https://www.conventionalcommits.org/) specification.
Message syntax matters, but the selected changes must tell one clear story too.

## Message Format

Every generated commit has a title and body:

```
<type>(<scope>): <imperative title>

<1-5 lines describing the change and, when useful, its reason or effect>
```

Use a lowercase scope that identifies the affected component. The title is concise,
imperative, lowercase, and has no trailing period. The body is concrete: explain the
behavior, motivation, or important implementation decision rather than restating the title.

| Type | Use for |
|------|---------|
| `feat` | New user-facing capability |
| `fix` | Corrected behavior |
| `docs` | Documentation only |
| `style` | Formatting only |
| `refactor` | Restructuring without behavior change |
| `test` | Tests only |
| `chore` | Maintenance or tooling |
| `perf` | Performance improvement |
| `ci` | Continuous integration configuration |
| `build` | Build system or dependencies |
| `revert` | Reverting a prior commit |

For breaking changes, add `!` after the scope and include a `BREAKING CHANGE:` footer.
Include issue footers such as `Closes #123` only when the issue is known.

## Create a Commit

When the user asks to commit, first inspect the complete worktree:

1. Run `git status --short`.
2. Read both `git diff --cached` and `git diff` so pre-staged work is not mistaken for the entire change.
3. List untracked files with `git ls-files --others --exclude-standard` and inspect relevant ones.
4. Read recent subjects with `git log --oneline -10` to match established scopes and wording.
5. Flag likely secrets, credentials, local configuration, or generated output. Do not stage them without explicit direction.

### Decide Whether to Split

Default to one commit containing all intended, related changes. Look for an obvious
file-level split only when changes are independent and each group can stand alone.

Keep these together:

- Implementation and its tests.
- Documentation that describes the same change.
- Dependency manifests and their lockfiles.

Do not invent a split for adjacent work, use hunk-level staging, or force the user
to reorganize a coherent change. If an obvious split exists, propose each commit with
its files and full message, then ask once for approval. If not, propose one commit.

### Approve, Stage, Commit

Before making any write, show:

- The files in each proposed commit.
- The full title and 1-5 line body for each commit.
- Any excluded files and why they are excluded.

Ask for approval unless the user explicitly authorizes committing immediately. After
approval, stage only the files for the approved commit with `git add -- <paths>` and
commit with the proposed title and body. Do not amend, rebase, push, or include
unapproved files.

Repository commit hooks are the final message validation when configured. Never bypass
a failing hook. Report the commit hash on success; report the error and leave changes
intact on failure.

## Validate a Commit Message

When the user asks to validate a message, check:

1. It follows `type(scope): imperative title`.
2. The type is listed above and the scope is lowercase.
3. The title is lowercase, imperative, concise, and has no trailing period.
4. A body follows after a blank line and contains 1-5 meaningful lines.
5. Breaking changes use both `!` and a `BREAKING CHANGE:` footer.

Return specific corrections and a revised message. When the repository configures
commitlint, use it as the authoritative validation rule.

### Delegated: Pull Request Creation

If the user wants to create a PR after committing, invoke the
[code-pull-request](../code-pull-request/SKILL.md) skill. It detects the platform
(GitHub/GitLab), finds a template, generates the body, and opens the PR via `gh`
or `glab`.

## Input Methods

| Input | Action |
|-------|--------|
| User says "commit" or "git commit" | Inspect the worktree, propose coherent commit(s), then commit after approval |
| User says "validate commit" | Check the commit message format |
| User pastes commit message | Validate the provided message |

## Error Handling

- If there are no changes: report that there is nothing to commit.
- If Git is not initialized: report it; do not initialize a repository unless asked.
- If a commit fails: show the error, preserve the worktree, and do not bypass hooks.

## Examples

**Input:** "I fixed the login bug"
**Output:**
```
fix(auth): resolve login timeout issue

Correct token expiry calculation so active users are not logged out after five minutes.
```

**Input:** "I added a new API endpoint for users"
**Output:**
```
feat(api): add user profile endpoint

Expose name, email, and avatar URL from `GET /users/:id`.

Closes #89
```

**Input:** "I changed the auth API, this breaks old clients"
**Output:**
```
feat(auth)!: change token validation endpoint

Require a Bearer token on `/auth/verify` instead of a query parameter.

BREAKING CHANGE: Clients must update to send
Authorization header with Bearer token.
```
