# Respond to Review (rs) — Interview Mode

## Overview

Interactive interview mode to resolve code review findings. No subagents.

The agent interviews the user one question at a time, multiple choice, until the blocking
findings are resolved and the user has chosen which others are worth fixing. Not every finding
deserves a fix: the agent recommends leaving low-value ones and spends the interview on what
matters. Fixes change the code. Intentional non-fix resolutions of interviewed findings are
recorded beside the relevant code so later reviews can honor the decision without restating the
full finding.

## Prompt

```
Interview me until the blocking findings are resolved and you know which non-blocking ones are
worth fixing. Recommend leaving low-value ones. Ask me questions 1 by 1, multiple choice.
```

## Triage

Sort every active finding into one of two groups:

| Group | Findings |
|-------|----------|
| Interview | Blocking findings; non-blocking High or Critical issues, pre-existing or not |
| Low-value batch | Everything else that is active: Medium and Low issues, suggestions, and nitpicks the Author took |

A finding that requires user approval or reopens a recorded decision is always interviewed.

## Behavior

1. Load the review findings from the current conversation context
2. Triage them (see above)
3. Offer every blocking finding marked **Mechanical** as one batch (see below)
4. Offer the low-value batch as one question (see below)
5. Interview the rest — blocking first, then non-blocking High or Critical, one question at a
   time, always multiple choice. Answered questions need no interview; list their answers for
   confirmation.
6. Classify each finding as fix, intentional/accepted risk, false positive, deferred, or left
   (low value). Findings marked **Follow-up** go to a follow-up list and are not fixed here.
7. Capture the rationale and reconsideration condition for every non-fix resolution of an
   interviewed finding
8. For a finding under Withdrawn in debate whose evidence is `intent`, `sdd` or `test`, offer a
   `review-decision:` comment recording that context. The user approves each one. Do not offer a
   comment when a plain code refutation withdrew it.
9. Present one plan containing the exact fixes and proposed decision comments
10. **Always ask the user before applying fixes or adding, changing, or removing comments**

## Mechanical Batch

Blocking findings marked **Mechanical** keep behavior identical, stay local, and need no
judgment. List them together, each with its location and exact change, and ask one question:

- a) Apply all
- b) Pick which to apply (the rest join the interview)
- c) Interview each one

## Low-Value Batch

List the low-value findings together. Give each a one-line recommendation, fix or leave, with
its reason, e.g. `Low, touches 3 files, no behavior change → leave`. Recommend leave unless the
fix is Mechanical and trivial. Then ask one question:

- a) Accept the recommendations
- b) Fix all
- c) Pick which to fix
- d) Interview each one

Applied fixes join the final plan like any other fix.

## Pushing Back

Each interview question puts the recommended option first and says why in one line. When the
evidence is weak, or the fix costs more than the risk it removes, recommend accepting the risk or
deferring rather than fixing. Agreeing with a finding is not the default.

## Resolution Rules

| Resolution | Action |
|------------|--------|
| Fix | Change the code; do not add a decision comment for a concern the change removes |
| Intentional / accepted risk | Add or update a decision comment with the reason the behavior is intentional and when to reconsider it |
| False positive | Add or update a decision comment that states the invariant or context that makes the concern inapplicable |
| Deferred | Add a decision comment only when the user supplies a concrete reconsideration condition or tracking reference; otherwise leave the finding active |
| Left (low value) | No action, rationale or decision comment, unless the user asks for one |

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

- One question at a time — never batch questions (each batch is a single question)
- Always provide multiple choice answers (a, b, c, d...)
- Blocking first, then non-blocking High or Critical; most ambiguous first within each group
- Skip findings that are clearly actionable without input (mechanical findings go through a batch)
- Skip nitpicks the Author left and findings withdrawn in debate, except as in step 8
- For a non-fix choice, ask for the rationale or reconsideration condition only when the
  conversation and repository do not already provide it
- After all questions are answered, show exact proposed comments with the fix plan and confirm
  before making changes
