---
name: spec:finish
description: >
  Post-implementation completion workflow. Use after spec:implement completes to validate,
  review, create stacked commits, and prepare for PR. Triggers when implementation is done,
  when the user says "finish", "done", "complete", or after implementation tasks are finished.
user-invocable: true
---

# Spec Finish

Post-implementation workflow: validate → review → stack commits → prepare PR.

## Prerequisites

Before starting, verify:
1. All implementation tasks complete
2. Working directory is clean (committed or staged)
3. Tests pass

If not complete → go back to spec:implement.

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

**If any fail:** Return to spec:implement to fix.

**If all pass:** Proceed.

---

## Step 2: Review

Use the Skill tool to invoke code:review skill for comprehensive code review.

### What to Review
- All changed files since feature branch
- Test coverage
- Documentation updates
- No debug code left

### If code:review finds issues
- Fix or note for follow-up
- Re-validate

---

## Step 3: Stack Commits

Use the Skill tool to invoke code:stacked-commit skill.

### Workflow
1. Review current stack: `gt stack`
2. Ensure commits are organized logically
3. Restack if needed: `gt branch restack`
4. Ensure each commit is clean and functional

### Commit Guidelines
- Each commit should pass tests
- Use conventional commit format
- Meaningful commit messages

---

## Step 4: Update Documentation

Optional - use code:docs skill if needed.

### Check for Updates
- README changes needed?
- API documentation updated?
- Changelog updated?

### If documentation needed
- Load code:docs
- Update relevant docs
- Commit with docs

---

## Step 5: Prepare for PR

### Verify
- All tests passing
- All reviews complete
- Documentation updated
- Commits stacked properly

### Summary for Human

```
## Completion Summary

**Feature:** [name]
**Tests:** [passed/failed]
**Type Check:** [passed/failed]
**Lint:** [passed/failed]
**Commits:** [N commits in stack]
**Ready for PR:** [yes/no]
```

### Handoff

> "Implementation complete. [N] commits stacked. Ready for [submit/open PR]."

---

## Integration

This skill orchestrates other skills:

- Invokes code:review for quality check
- Invokes code:stacked-commit for commit management
- Invokes code:docs if documentation needs updates

---

## When NOT to Use

- If implementation still in progress → use spec:implement
- If tests failing → go back to spec:implement
- If review found blocking issues → go back to spec:implement
