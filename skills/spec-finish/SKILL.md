---
name: spec-finish
description: >
  Post-implementation completion workflow. Use after spec-implement completes to validate,
  review, create stacked commits, and open a PR via code-pull-request. Triggers when
  implementation is done, when the user says "finish", "done", "complete", or after
  implementation tasks are finished.
user-invocable: true
---

# Spec Finish

Post-implementation workflow: validate → review → stack commits → prepare PR.

## Prerequisites

Before starting, verify:
1. All implementation tasks complete
2. Working directory is clean (committed or staged)
3. Tests pass

If not complete → go back to spec-implement.

---

## Step 1: Validate

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

**If any fail:** Return to spec-implement to fix.

**If all pass:** Proceed.

---

## Step 2: Review

Use the Skill tool to invoke code-review skill for comprehensive code review.

### What to Review
- All changed files since feature branch
- Test coverage
- Documentation updates
- No debug code left

### If code-review finds issues
- Fix or note for follow-up
- Re-validate

---

## Step 3: Stack Commits

### Workflow
1. Review current commits: `git log --oneline`
2. Ensure commits are organized logically
3. Rebase if needed: `git rebase -i <base-branch>`
4. Ensure each commit is clean and functional

### Commit Guidelines
- Each commit should pass tests
- Use conventional commit format
- Meaningful commit messages

---

## Step 4: Update Documentation

### Check for Updates
- README changes needed?
- API documentation updated?
- Changelog updated?

### If documentation needed
- Update relevant docs
- Commit with docs

---

## Step 5: Open the PR

Steps 1-4 (validate, review, stack commits, update docs) must all be complete
before proceeding. **If code-review found blocking issues, stop — return to
spec-implement to fix them. Do not proceed to Step 5b.**

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

> "Implementation complete. [N] commits stacked. Opening PR now."

---

## Integration

This skill orchestrates other skills:

- Invokes code-review for quality check
- Invokes code-pull-request as the final step to open the PR

---

## When NOT to Use

- If implementation still in progress → use spec-implement
- If tests failing → go back to spec-implement
- If review found blocking issues → go back to spec-implement
