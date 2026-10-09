---
name: spec-implement
description: >
  Continue an approved Spec-backed workflow when the user says "implement", "go", "start", or
  "do it". After Codex Plan Mode, persist the next missing design.md or plan.json artifact and
  stop. When both artifacts exist, execute plan.json with TDD and report between batches.
user-invocable: true
---

# Spec Implement

Execute the approved Spec-backed Plan. Track progress when it uses tracked tasks. Report. Stop
when blocked.

**Announce at start:** "I'm using the spec-implement skill to execute this plan."

This skill does not make design decisions or change approved content. It may persist approved
content from the conversation when Plan Mode could not write the required artifact. If the plan
is wrong, go back to spec-plan. If the design is wrong, go back to spec-brainstorm.

## Prerequisites

Resolve required artifacts in order before starting product implementation:

1. If `docs/specs/YYYY-MM-DD-<feature>/design.md` is missing, write it from the approved design
   in the current conversation. Validate the file, report its path, and stop. Do not create
   `plan.json` or start implementation in the same invocation.
2. Otherwise, if `docs/specs/YYYY-MM-DD-<feature>/plan.json` is missing, write it from the
   approved plan in the current conversation. Validate it against the schema in `spec-plan`,
   report its path, and stop. Do not start implementation in the same invocation.
3. If the approved content needed for the next missing artifact is not available in the current
   conversation, stop and tell the human what content is unavailable. Do not ask the human to
   create the file.
4. When both artifacts exist, verify that any tracker entries selected during planning are
   available, along with `docs/agents/issue-tracker.md` when tracking is configured.
5. Verify that you are not on main/master without explicit user consent. Create a branch or use
   a git worktree first.

Each invocation creates at most one missing artifact. Only proceed to product implementation
when both approved artifacts existed at the start of the invocation.

---

## Step 1: Load and Review the Plan

Read plan.json critically before writing code. Look for:

- Unclear or ambiguous tasks
- Missing file paths or incomplete validation criteria
- Tasks that conflict with each other
- Dependencies that don't match what you see in the codebase
- Existing code or platform behavior that already satisfies a planned capability
- Duplicate IDs, parsers, errors, schemas, lifecycle handling, or test utilities
- Shared abstractions with fewer than two current consumers
- Tests whose only purpose is validating a new wrapper

If planned machinery fails these checks, stop before implementing it and return to
`spec-plan` with a smaller revision for human review. Preserve the approved behavior and scope;
do not force an unsupported structure through implementation.

For other concerns, **raise them with the human before starting**. Don't guess. Don't assume.
Don't force through blockers.

If no concerns, proceed. Use existing tracker entries when present.

---

## Step 2: Choose Execution Style

If the human has not specified an execution style, ask.

### Autonomous Mode

> "Implement it all. Don't stop until you're done."

- Execute all tasks in dependency order
- Track progress when the Spec-backed Plan has tracker entries
- Run type checking / linting continuously
- Only stop if blocked

### Batched Mode (default)

> "Do a few tasks at a time."

- Execute 3-5 tasks
- Stop and report: what was done, test output, anything unexpected
- Wait for human feedback before continuing

### Delegation (all modes)

In any mode, delegate a task to a fresh subagent when **the design is already settled and the
file just needs to be made**, as defined by the **code-subagents** "When to Use" criteria.

- Invoke **code-subagents** for eligibility, dispatch patterns, and the implementer template
- Paste the relevant design excerpt into the dispatch so the subagent makes no design decisions
- Never name an agent; the harness chooses from agent descriptions
- Keep coupled, exploratory, or design-sensitive tasks in the main thread
- The main agent runs the combined plan and code-quality review per completed batch, and the
  validation commands itself

### Subagent Mode

> "Use subagents."

Delegate every eligible task. Independent tasks dispatch in parallel, dependent tasks run
sequentially.

Default to batched if the human hasn't expressed a preference; delegation still applies per
task.

---

## Step 3: Execute the Plan

Preserve the approved behavior and scope. Treat the plan's proposed structure as a hypothesis
that must remain supported by repository evidence.

For each task, find the next unblocked task directly from `plan.json`. When tracker entries
exist, use `docs/agents/issue-tracker.md` to keep their execution state in sync; tracker state
never overrides the plan's dependency graph.

When a tracker exists, mark it in progress according to `docs/agents/issue-tracker.md`.

### For each task

Read the task's **inputs** and **description** first.

For behavior-changing code tasks, write tests that cover the validation criteria before writing
implementation. For documentation, configuration, migration, or verification-only tasks, use the
task's stated validation instead. Invoke an installed language-specific testing skill when needed.
Write tests at the module's interface (see **oracle-codebase-design**), and use its red flags
when refactoring.

```
1. Read task inputs and description
2. Write failing tests (cover validation criteria)
3. Run them — verify they fail for the RIGHT reason
4. Implement minimal code to make tests pass
5. Refactor if needed (tests stay green)
```

For behavior-changing code, do NOT write implementation before tests. Do NOT skip "verify it
fails." Do NOT write more code than needed to pass the test.

Verify the task against its **validation** and acceptance criteria.

### After each batch: Validate and commit

Run the task's focused validation and inspect the local diff for accidental or out-of-scope
changes. Report deviations and unexpected findings. Use **code-commit** for any commit; plan
approval does not bypass its approval gate. Comprehensive **code-review** happens in
**spec-finish**.

### On completion

When a tracker exists, mark the task complete according to
`docs/agents/issue-tracker.md`.

### Referencing existing code

When the plan or human references existing implementations ("make it look like the
users table"), read the referenced code before making changes. A reference communicates
all implicit requirements without spelling them out.

---

## Step 4: Report (Batched Mode)

After each batch:

```
Completed: [tasks]
- [completed work]

Test output: 6 passed, 0 failed
Type check: clean

Ready for feedback.
```

Wait. Don't continue until the human responds.

---

## Step 5: Handle Feedback

Expect short, terse corrections:

- "You didn't implement `deduplicateByTitle`."
- "This should be in the admin app. Move it."
- "wider" / "still cropped"

Don't ask for elaboration unless genuinely needed.

### Steering patterns

| Pattern | Example | What to do |
|---------|---------|------------|
| Cherry-pick | "Use X for the first one. Ignore the fourth." | Item-level as directed |
| Trim scope | "Skip task T7." | Mark skipped, move on |
| Protect interfaces | "These signatures must not change." | Adapt callers |
| Override | "Use the library's built-in method." | Direct override |
| Revert | "I reverted. Now just do X." | Respect narrowed scope |

### On revert

If the human reverts git changes and re-scopes, respect the narrowed scope completely.
Don't salvage the previous approach. Don't ask "are you sure?"

---

## When to Stop and Ask

**STOP immediately when:**

- A test fails and you can't fix it within 2 attempts
- You hit a dependency not covered in the plan
- An instruction is unclear or ambiguous
- The plan conflicts with the actual codebase
- The design needs to change, not just the implementation
- Verification fails repeatedly

**When you stop:**

1. Explain the blocker clearly
2. Show what you tried
3. Ask for direction

Do not guess. Do not work around it. Stop and ask. **Ask for clarification rather than
guessing.**

If the plan needs to change:

> "This needs a plan revision. Want me to go back to spec-plan?"

If the design was wrong:

> "This changes design assumptions. Want me to go back to spec-brainstorm?"

---

## When to Revisit Earlier Steps

**Return to spec-plan when:**
- A material change affects approved behavior, scope, architecture, public contracts, or major dependencies
- Tasks cannot be completed without one of those material changes

Minor deviations may be recorded inline and reflected in plan.json when useful. Report them in the
next progress update.

**Return to spec-brainstorm when:**
- The fundamental approach needs rethinking
- Implementation reveals the design is wrong

---

## Completion

When all planned work is done, verify and present it.

### Verification checklist

1. **Run full test suite** — all tests must pass, not just the new ones
2. **Run type check / lint** — clean output, no new warnings
3. **Verify completion** — close every tracker entry when tracking is used
4. **Diff review** — review the full diff against the intended base branch. Look for:
   - Files that changed but shouldn't have
   - Debug code or temporary hacks left behind
   - Inconsistencies between what was planned and what was built

### Summary report

Present to the human:

```
## Feature Complete: {feature name}

**Plan:** Spec-backed Plan
**Tasks:** {completed} / {total}
**Tests:** {new tests added}, {total passing}
**Files:** {created}, {modified}

### What was built
- [concise list of what was implemented]

### Verification
- Test suite: ✓ all passing
- Type check: ✓ clean
- Lint: ✓ clean
- Comprehensive code review: pending spec-finish

### Ready for review
```

### Next steps

After all planned work is complete and verified, the next step is **spec-finish**.

> "Implementation complete. Ready to validate, review, and prepare for PR?"

Offer the human their options:

> **Finish** — invoke spec-finish to validate, review, stack commits
> **Keep** — leave the branch for now, come back later
> **Discard** — delete the branch, start over

Don't choose for them. Present options and wait.

If validation finds bugs, loop back to implement. See **atelier-orchestrator**
for iteration patterns.
