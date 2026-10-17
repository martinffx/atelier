---
name: spec-loop
description: >
  Loop an approved Spec-backed Plan to a PR: implement each batch in a subagent, commit,
  code-review rq, code-review rs, fix in a subagent, commit, repeat, then open the PR. Use when
  the user says "loop", "run it to the end", or "implement everything and open a PR".
user-invocable: true
---

# Spec Loop

Drive an approved Spec-backed Plan to a PR. Each batch is implemented, committed, reviewed,
fixed, and committed again. The main agent only drives; subagents do the implementation.

**Announce at start:** "I'm using the spec-loop skill to run this plan to a PR."

This skill makes no design decisions. If a finding or blocker needs a plan change, go back to
`spec-plan`. If it needs a design change, go back to `spec-brainstorm`.

## Start

1. Follow **spec-implement** Prerequisites and Step 1 (plan review). Raise concerns now, while
   the human is present. If `design.md` or `plan.json` is missing, stop and use spec-implement.
2. Stop if `git status` shows uncommitted changes.
3. Run the test suite once and record tests that already fail. Never blame a batch for them.
4. Ask one authorization question, naming each action:
   - commit after every batch and every fix round
   - push to `<remote>/<branch>` and open the PR (draft or ready)
   - cost: roughly 8 review subagents per batch

   The answer is the explicit authorization **code-commit** and **code-pull-request** require.
   Fixes still go through `rs`, so review gates are unchanged.

## Resume State

State lives in git. There is no progress file.

- **Base:** `git merge-base <default-branch> HEAD`
- **Implement commits** carry `Spec-Task: <feature>/<task-id>` for each task actually completed
- **Fix commits** carry `Spec-Reviewed: <reviewed-head-sha>`. When `rs` yields no fixes, record it
  with an empty commit
- **On re-invocation:** stop if the tree is dirty. Done tasks are the `Spec-Task:` footers for
  this feature in `base..HEAD`. If any commit is newer than the last `Spec-Reviewed:`, review
  that range before selecting new tasks

## Loop

Repeat until every task in `plan.json` is done.

1. **Select** the next 3-5 unblocked tasks from the `depends_on` graph. Record
   `BATCH_BASE=HEAD`.
2. **Implement** in one fresh subagent for the whole batch. Use the template from
   **code-subagents** (`references/implementor-prompt.md`) with the full task entries, the
   relevant `design.md` excerpt, spec-implement Step 3 (TDD), and these rules: do not stage or
   commit; when `design.md` cannot answer a question, return BLOCKED with the question. Select
   the agent explicitly (see Delegation in `atelier-orchestrator`). In Codex, pick the closest
   agent that can write files and say which.
3. **Validate and commit.** The main agent checks the diff for out-of-scope files, runs each
   task's validation and the suite (re-run a failure once), then commits with **code-commit**.
   Partially completed batches commit only the finished tasks; treat the rest as a blocker.
4. **Review:** `code-review rq $BATCH_BASE`. State the goal: "Batch Tn-Tm of `<feature>`. Later
   tasks are not implemented yet, so planned `new_abstractions.consumers` count as consumers."
5. **Plan fixes:** `code-review rs`. Run the interview as written. Stop if it resolves a
   finding as a plan or design change.
6. **Fix** in one fresh subagent given rs's confirmed fix list and the files it owns. Validate
   and commit with the `Spec-Reviewed:` footer.
7. **Cap:** at most 2 rq, rs, fix rounds per batch, then escalate (see "When to escalate" in
   `atelier-orchestrator`).
8. **Report** one line, for example `Batch 2/5: T4-T6 done, 3 fixed, 1 deferred`. After about 3
   batches, suggest re-invoking `/spec-loop` in a fresh session; resume makes that safe.

## Finish

1. Run the spec-implement Completion checklist.
2. Run **spec-finish** Steps 1-3 (simplify, docs, validate).
3. Run `code-review rq <base>` then `rs` over the whole branch, fix in a subagent, and commit.
   This catches cross-batch problems and reviews the simplify and docs edits.
4. Invoke **code-pull-request**, listing deferred findings in the body.

## Stop and Report

Besides spec-implement's "When to Stop and Ask", stop when:

- the implementer returns BLOCKED
- `rs` routes a finding to a plan or design change
- the round cap is hit

Report the blocker and what was tried, and say that `/spec-loop` resumes from git.
