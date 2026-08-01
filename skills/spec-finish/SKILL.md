---
name: spec-finish
description: >
  Post-implementation completion workflow for Spec-backed Plans. Use after spec-implement
  completes to validate, review, create stacked commits, and open a PR via code-pull-request.
  Triggers only with an active Spec-backed Plan after spec-implement completes, including when
  the user says "finish", "done", or "complete" in that context.
user-invocable: true
---

# Spec Finish

Post-implementation workflow: synchronize docs → validate → review → prepare PR.

## Prerequisites

Before starting, verify:
1. All Spec-backed Plan tasks are complete
2. Working directory has no unresolved staged or unstaged changes
3. Tests pass

If not complete, go back to `spec-implement`.

---

## Step 1: Update Documentation

Check whether README, API documentation, or changelog updates are needed. Make and commit any
necessary documentation changes through **code-commit** before final validation.

---

## Step 2: Validate

Run validation checks.

### Test Suite
```bash
npm test
# or
pytest
# or
cargo test
```

### Type Check
```bash
npm run typecheck
# or
python -m mypy
# or
cargo check
```

### Lint
```bash
npm run lint
# or
ruff check .
# or
cargo clippy
```

### Build
```bash
npm run build
# or
go build ./...
```

**If any fail:** Return to `spec-implement` to fix.

**If all pass:** Proceed.

---

## Step 3: Review

Invoke the installed **code-review** skill through the harness's skill mechanism for one
comprehensive review of the final change.

### What to Review
- All changed files since the intended base branch's merge base
- Test coverage
- Documentation updates
- No debug code left

### If code-review finds issues
- Minor fixes may be made here, then re-validated and reviewed.
- Blocking or scope-changing fixes return to `spec-implement`.

---

## Step 4: Prepare Commits

Review current commits with `git log --oneline`. Use **code-commit** for any uncommitted work.
Do not rewrite history by default. If a rebase would materially improve an unpublished stack,
show the affected range and ask for separate approval before rebasing.

---

## Step 5: Prepare the PR

Steps 1-4 (documentation, validation, review, commits) must all be complete
before proceeding. **If code-review found blocking or scope-changing issues, stop and return
to spec-implement to fix them. Do not proceed to Step 5b.**

### Step 5a: Present Completion Summary

Before creating the PR, present a summary to the human:

```
## Completion Summary

**Feature:** [name]
**Tests:** [passed/failed]
**Type Check:** [passed/failed]
**Lint:** [passed/failed]
**Review:** [passed/issues found]
**Commits:** [N commits in stack]
**Ready for PR:** [yes/no]
```

### Step 5b: Invoke code-pull-request

Only when the summary shows **Ready for PR: yes**, invoke the
[code-pull-request](../code-pull-request/SKILL.md) skill to create the PR. It
detects the platform (GitHub/GitLab), checks for an existing PR, finds a
template, generates the body from commits, and opens the PR via `gh` or `glab`.

### Handoff

> "Implementation complete. [N] commits are ready. PR package ready for approval."

---

## Integration

This skill orchestrates other skills:

- Invokes code-review for quality check
- Invokes code-pull-request as the final step to open the PR

---

## When NOT to Use

- If implementation is still in progress, use spec-implement
- If tests are failing, go back to spec-implement
- If review found blocking or scope-changing issues, go back to spec-implement
