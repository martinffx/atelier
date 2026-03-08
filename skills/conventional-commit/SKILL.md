---
name: conventional-commit
description: Generate and validate conventional commit messages following the conventionalcommits.org spec. Use whenever the user wants to commit code, mentions commit messages, git commit, or asks to create a commit. Triggers on "commit", "git commit", "conventional", or when reviewing commit message format.
user-invocable: true
---

# Conventional Commit Skill

Generate and validate commit messages following the [Conventional Commits](https://www.conventionalcommits.org/) specification.

## Conventional Commit Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style (formatting, semicolons, etc.) |
| `refactor` | Code change that neither fixes nor adds |
| `test` | Adding or updating tests |
| `chore` | Build, tooling, dependencies |
| `perf` | Performance improvement |
| `ci` | CI configuration changes |
| `build` | Build system or dependencies |
| `revert` | Reverting a previous commit |

### Rules

- **Subject**: Short description, imperative mood, lowercase, no period at end
- **Scope**: Optional, lowercase, describes what was changed (e.g., `auth`, `api`, `ui`)
- **Breaking changes**: Add `!` after type/scope: `feat(auth)!: change API`
- **Footer**: For breaking changes (`BREAKING CHANGE:`) or issue references (`Closes #123`)

## Operations

### 1. Generate Commit from Diff

When user wants to commit changes:

1. Run `git status` to see changed files
2. Run `git diff --staged` for staged changes
3. Analyze what changed to determine:
   - **Type**: Which type best describes the changes?
   - **Scope**: What area was affected? (optional)
   - **Subject**: What was done? (imperative: "add" not "added")
4. Create a conventional commit message
5. Run `git commit -m "<message>"`

**Example:**
```
feat(auth): add JWT token refresh

Implements token refresh endpoint to extend sessions
without requiring re-authentication.

Closes #142
```

### 2. Validate Commit Message

When user asks to validate or check a commit message:

1. Parse the commit message
2. Check format: `<type>(<scope>): <subject>`
3. Validate type is from the allowed list
4. Check subject follows rules (lowercase, imperative, no period)
5. Flag any issues found

## Input Methods

| Input | Action |
|-------|--------|
| User says "commit" or "git commit" | Generate from git diff, then commit |
| User says "validate commit" | Check the commit message format |
| User pastes commit message | Validate the provided message |

## Auto-Commit Workflow

When generating a commit:

1. Show the user the commit message first
2. Ask for confirmation before committing (unless user explicitly says "just do it")
3. Execute `git commit -m "<message>"` after confirmation
4. Show the result of the commit

## Error Handling

- If no staged changes: `git status` shows nothing → warn user nothing to commit
- If git not initialized: Initialize repo or warn user
- If commit fails: Show error and offer to retry

## Examples

**Input:** "I fixed the login bug"
**Output:**
```
fix(auth): resolve login timeout issue

Users were logged out after 5 minutes due to
incorrect token expiry calculation.
```

**Input:** "I added a new API endpoint for users"
**Output:**
```
feat(api): add user profile endpoint

GET /users/:id returns user profile data including
name, email, and avatar URL.

Closes #89
```

**Input:** "I changed the auth API, this breaks old clients"
**Output:**
```
feat(auth)!: change token validation endpoint

The /auth/verify endpoint now requires Bearer token
instead of query parameter.

BREAKING CHANGE: Clients must update to send
Authorization header with Bearer token.
```
