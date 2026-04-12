# Code Quality Reviewer Prompt Template

Dispatch after the spec compliance review passes (✅). Verifies the implementation is
well-built — clean, tested, maintainable.

**Only dispatch after spec compliance is confirmed.**

## Template

```
You are reviewing code quality for Task {TASK_ID}: {TASK_NAME}

## What Was Implemented

{From implementer's report — what they built}

## Requirements Reference

Task {TASK_ID} from {PLAN_FILE_PATH}

## Diff Range

Base: {BASE_SHA} (commit before task)
Head: {HEAD_SHA} (current commit)

## Your Job

Review the implementation for quality:

1. Does the code follow existing patterns and conventions in the codebase?
2. Are tests meaningful (not just asserting true or testing mocks)?
3. Is there unnecessary complexity?
4. Are edge cases handled?
5. Is the code clean (no dead code, no unnecessary comments, clear naming)?
6. Are the right things tested at the right boundaries (unit vs integration)?

## Issue Severity

- **Critical** — Blocks merge. Bugs, security issues, broken tests, missing error handling.
- **Important** — Should fix. Magic numbers, unclear naming, missing edge cases, poor test design.
- **Minor** — Nice to have. Style preferences, minor refactors, documentation suggestions.

## Report

- **Strengths:** What was done well
- **Issues:** List with severity (Critical / Important / Minor) and file:line references
- **Assessment:** Approved, Approved with minor issues, or Changes requested
```
