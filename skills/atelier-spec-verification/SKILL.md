---
name: atelier-spec-verification
description: Evidence-based verification before completion claims. Use when verifying work is complete, running verification commands, checking test results, or claiming implementation is done.
user-invocable: false
---

# Verification Skill

Evidence-based verification before completion claims. Verify work is complete with actual evidence, not assumptions.

## The Iron Law

**EVIDENCE BEFORE ASSERTIONS**

Never claim work is "complete", "done", "fixed", or "passing" without running verification commands and showing actual output. If you can't show the evidence, the claim is hollow.

## The Gate Function

Before claiming completion, complete these steps:

### Step 1: Run Tests
```bash
npm test   # or pytest, cargo test, etc.
```

**You MUST show actual output** - not "tests pass" but the actual test results.

### Step 2: Check Linting
```bash
npm run lint   # or ruff, biome, etc.
```

### Step 3: Type Check
```bash
npm run typecheck   # or tsc --noEmit, mypy, etc.
```

### Step 4: Manual Verification
- Run the application
- Test the feature manually
- Verify the expected behavior

### Step 5: Document Results
Record what was verified:
- Test results (with output)
- Lint results (with output)
- Manual verification steps
- Any issues found

## Common Failures

| Failure | What Actually Happened |
|---------|----------------------|
| "Tests pass" | Didn't run tests |
| "It works" | Didn't verify |
| "No issues" | Didn't check |
| "Looks good" | No evidence |
| "Should be fine" | Assumption, not verification |

## Red Flags

**Claims without evidence:**
- "Tests pass" without showing output
- "No bugs" without testing
- "Works fine" without verifying
- "All good" without checking
- "Done" without verification

## Rationalization Prevention

| Rationalization | What To Do Instead |
|-----------------|-------------------|
| "I'll verify later" | Verify now, not later |
| "It probably works" | Run the tests |
| "I don't need to check" | Evidence before assertions |
| "It's obvious" | Show the evidence anyway |
| "I already tested it" | Run verification again |

## Key Patterns

1. **Run commands, show output** - Don't just say it works
2. **Check before claiming** - Verify before saying it's done
3. **Document evidence** - Record what you verified
4. **Show, don't tell** - Evidence > assertions
5. **Verify then claim** - Completion requires verification

## Why This Matters

Without evidence-based verification:
- Bugs slip into production
- Assumptions replace testing
- "Complete" means "maybe done"
- Quality degrades over time

With evidence-based verification:
- Issues are caught early
- Completeness is verified
- Quality is maintained
- Trust is built

## When To Apply

**Always:**
- After implementing a feature
- After fixing a bug
- Before creating a PR
- Before merging
- Before marking tasks complete

**Evidence is required for any completion claim.**

## Integration

**Required by:**
- Subagent-driven development (after each task)
- Parallel execution (after parallel work)
- Finishing a development branch (before PR)

**Verifies:**
- Tests pass (with output)
- Linting passes (with output)
- Type checking passes (with output)
- Manual verification (with results)
