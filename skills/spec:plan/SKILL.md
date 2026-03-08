---
name: spec:plan
description: >
  Write implementation plans, iterate with human annotations, create structured tasks. Use
  when there's an approved spec (spec.md) and the next step is breaking it into implementable
  work. Trigger when the user says "write a plan", "plan this out", "break this down",
  "I added notes" (annotation cycle), or after spec:design completes. Also trigger for
  "create tasks" or "add to beads". Do NOT use for research/design (use spec:design) or
  execution (use spec:implement).
user-invocable: true
---

# Spec Plan

Write a plan so detailed that an engineer with zero codebase context and questionable taste
could follow it. Let the human tear it apart through annotation cycles until it's right.
Then create structured tasks. This skill does not write code.

## Artifacts

```
docs/specs/YYYY-MM-DD-<feature-name>/
├── requirements.json  ← From spec:product
├── spec.md            ← From spec:design (approved)
└── plan.json          ← This skill's output
```

The plan starts as a markdown draft for human annotation, then gets converted to
structured plan.json when approved.

See [references/schemas.md](references/schemas.md) for the plan.json schema.

---

## Step 1: Write the Plan Draft

Read the approved spec.md, then write a detailed implementation plan as a markdown section
at the bottom of spec.md (or as a separate draft — whichever the human prefers).

### Plan quality

Write assuming the implementer:
- Is a skilled developer but knows nothing about this codebase
- Doesn't know good test design very well
- Will take the path of least resistance if the plan is vague
- Needs exact file paths, complete code, and exact commands

### Task structure

Each task should be bite-sized (2-5 minutes) and include:
- **Files**: Exact paths to create, modify, and test
- **Test**: The failing test to write first, with exact command and expected output
- **Implementation**: The minimal code to make the test pass
- **Verification**: Exact command and what passing looks like
- **Commit**: Message following project conventions

### Task ordering

Follow bottom-up dependency ordering from spec:architect:

```
Entity → Repository → Service → Router/Consumer
```

### Task granularity

Each step is one action:
- "Write the failing test" — one step
- "Run it to verify it fails" — one step
- "Implement the minimal code" — one step
- "Run tests to verify pass" — one step
- "Commit" — one step

If a task takes longer than 5 minutes, break it down further.

DRY. YAGNI. TDD. Frequent commits.

**Tell the human:** "Plan draft is ready for review."

**STOP. Wait for human review.**

---

## Step 2: The Annotation Cycle

The human annotates the plan draft directly — adding corrections, rejections, domain
knowledge, business constraints, or "remove this entirely."

```
You write plan → Human adds inline notes → You address all notes → Repeat 1-6x
```

When the human says "I added notes":

1. Re-read the entire document
2. Address every single note
3. Update the plan
4. **Do not create tasks. Do not implement.**

The "don't implement yet" guard is sacred. The plan is not ready until the human
explicitly approves it.

### Steering patterns

| Pattern | Example | What to do |
|---------|---------|------------|
| Correct assumptions | "use PATCH not PUT" | Fix it |
| Reject approaches | "remove caching, we don't need it" | Cut cleanly |
| Add constraints | "queue consumer already handles retries" | Restructure |
| Override choices | "use drizzle:generate, not raw SQL" | Direct override |
| Redirect sections | "visibility on the list, not items" | Rethink section |
| Trim scope | "remove download, not implementing now" | Remove, no stubs |

---

## Step 3: Create Structured Tasks

When the human approves — "looks good", "approved", "create tasks" — convert the plan
into plan.json.

### What to do

1. Convert the annotated plan draft into structured plan.json following the schema
2. Each task maps to a bite-sized unit with steps, files, code, and commands
3. Dependencies between tasks are captured in `depends_on` fields
4. Create corresponding beads tasks if beads is available:

```bash
# Create epic
bd create "Feature: <name>" -t epic -p 1 -l feature,<name>

# Create tasks per phase
bd create "<task name>" -t task -p 2 -l <layer>,<feature> -e <epic-id>

# Add dependencies
bd dep add <entity-task> <repo-task> --type blocks
```

### Verification

After creating plan.json, verify:
- Every task has an ID and depends_on field
- Dependencies form a valid DAG (no cycles)
- Every task has at least one step
- File paths are complete and specific
- Code snippets are complete (not "add validation here")

---

## Handoff

When plan.json is created and tasks exist, the next step is **spec:implement**.

Tell the human:

> "Plan is approved and tasks are created. Ready to start implementation?"
>
> **Autonomous** — I'll work through all tasks, only stopping if blocked.
>
> **Batched** — I'll do 3-5 tasks at a time, then report and wait for feedback.

Do not start implementing. That's spec:implement's job.

---

## Quick Reference

| Human says | You do |
|------------|--------|
| "write a plan" / "plan this" | Step 1 → write plan draft, stop |
| "I added notes" | Re-read, address all notes, do NOT implement |
| "don't implement yet" | Update plan only |
| "looks good" / "approved" / "create tasks" | Step 3 → create plan.json + beads tasks |
