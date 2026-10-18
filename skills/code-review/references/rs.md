# Respond to Review (rs) — Interview Mode

## Overview

Interactive interview mode to resolve code review findings. No subagents.

The agent interviews the user one question at a time, multiple choice, until each finding has
a resolution. Fixes change the code. Intentional non-fix resolutions are recorded beside the
relevant code so later reviews can honor the decision without restating the full finding.

## Prompt

```
Interview me until you have enough context to resolve all the issues raised by the code review.
Ask me questions 1 by 1, multiple choice.
```

## Behavior

1. Load the review findings from the current conversation context
2. Offer every active finding marked **Mechanical** as one batch (see below)
3. Offer the nitpicks the Author took as one batch: apply all, pick which, or interview each
4. Interview blocking findings first, then non-blocking ones — one question at a time, always
   multiple choice. Answered questions need no interview; list their answers for confirmation.
5. Classify each finding as fix, intentional/accepted risk, false positive, or deferred.
   Findings marked **Follow-up** go to a follow-up list and are not fixed here.
6. Capture the rationale and reconsideration condition for every non-fix resolution
7. For a finding withdrawn in debate on `intent`, `sdd` or `test` evidence, offer a
   `review-decision:` comment recording that context. The user approves each one. Do not offer a
   comment when a plain code refutation withdrew it.
8. Present one plan containing the exact fixes and proposed decision comments
9. **Always ask the user before applying fixes or adding, changing, or removing comments**

## Mechanical Batch

Findings marked **Mechanical** keep behavior identical, stay local, and need no judgment. List
them together, each with its location and exact change, and ask one question:

- a) Apply all
- b) Pick which to apply (the rest join the interview)
- c) Interview each one

Applied mechanical fixes join the final plan like any other fix. A finding that requires user
approval or reopens a recorded decision is never batched.

## Resolution Rules

| Resolution | Action |
|------------|--------|
| Fix | Change the code; do not add a decision comment for a concern the change removes |
| Intentional / accepted risk | Add or update a decision comment with the reason the behavior is intentional and when to reconsider it |
| False positive | Add or update a decision comment that states the invariant or context that makes the concern inapplicable |
| Deferred | Add a decision comment only when the user supplies a concrete reconsideration condition or tracking reference; otherwise leave the finding active |

## Decision Comment Contract

Use the language's native comment syntax and this tagged prose format:

```text
review-decision: <concern> — <rationale>. Reconsider if <condition>.
```

For example:

```typescript
// review-decision: retry count is intentionally unbounded — the caller enforces a deadline. Reconsider if this function becomes part of the public API.
```

- Put the comment at the closest stable code location that owns the relevant behavior or invariant.
- Explain the code and its constraints, not the review conversation or the reviewer.
- Keep the concern, rationale, and reconsideration condition specific enough to validate later.
- Update an existing matching comment instead of adding a duplicate.
- Remove or revise a comment when its concern is fixed or its assumptions no longer hold.
- Do not create IDs, a registry entry, or duplicate comments across every affected call site.

## Guidelines

- One question at a time — never batch questions (the mechanical batch is a single question)
- Always provide multiple choice answers (a, b, c, d...)
- Start with the most ambiguous findings first
- Skip findings that are clearly actionable without input (mechanical findings go through the batch)
- Skip nitpicks the Author left and findings withdrawn in debate, except as in step 7
- For a non-fix choice, ask for the rationale or reconsideration condition only when the
  conversation and repository do not already provide it
- After all questions are answered, show exact proposed comments with the fix plan and confirm
  before making changes
