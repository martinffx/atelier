---
name: spec-plan
description: >
  Write implementation plans, iterate with human annotations, create structured tasks. Use
  when there's an approved spec (design.md) and the next step is breaking it into implementable
  work. Trigger when the user says "write a plan", "plan this out", "break this down",
  "I added notes" (annotation cycle), or after spec-brainstorm completes. Also trigger for
  "create tasks" or "add to beads". Do NOT use for research (use spec-brainstorm) or
  execution (use spec-implement).
user-invocable: true
---

# Spec Plan

Write a plan so clear that any engineer can follow it. Let the human tear it apart
through annotation cycles until it's right. Then create structured tasks. This skill does
not write code.

## Artifacts

```
docs/specs/YYYY-MM-DD-<feature-name>/
├── design.md  ← From spec-brainstorm (approved)
└── plan.json  ← This skill's output
```

The plan starts as a markdown draft for human annotation, then gets converted to
structured plan.json when approved.

### plan.json Schema

```json
{
  "feature": "user-authentication",
  "spec": "docs/specs/2026-03-08-user-auth/design.md",
  "goal": "Add email/password authentication with session management",
  "phases": [
    {
      "id": "P1",
      "name": "Domain Model",
      "tasks": [
        {
          "id": "T1",
          "name": "Implement UserEntity with validation",
          "depends_on": [],
          "inputs": [
            "User schema from design.md",
            "Validation rules (email format, password strength)"
          ],
          "description": "Create UserEntity with email and password fields. Implement validation using a Result type. Password must be hashed, never stored plaintext.",
          "files": {
            "create": ["src/entities/user.ts", "tests/entities/user.test.ts"],
            "modify": []
          },
          "validation": {
            "tests": [
              "rejects empty email",
              "rejects invalid email format",
              "rejects weak password",
              "accepts valid user input"
            ],
            "acceptance": [
              "All validation tests pass",
              "User.fromRequest returns Result<User>",
              "No direct throws — all errors via Result"
            ]
          }
        }
      ]
    }
  ]
}
```

#### Top-level fields

| Field | Type | Description |
|-------|------|-------------|
| feature | string | Kebab-case feature name |
| spec | string | Path to the approved design.md |
| goal | string | One-sentence goal |
| phases | Phase[] | Implementation phases in dependency order |

#### Phase fields

| Field | Type | Description |
|-------|------|-------------|
| id | string | Phase identifier (P1, P2...) |
| name | string | Phase name (e.g. "Domain Model", "Data Access") |
| tasks | Task[] | Tasks within this phase |

#### Task fields

| Field | Type | Description |
|-------|------|-------------|
| id | string | Task identifier (T1, T2...) |
| name | string | What this task implements |
| depends_on | string[] | Task IDs that must complete first |
| inputs | string[] | What you need to know before starting |
| description | string | What to build, key decisions, constraints |
| files | {create, modify} | Files to create and modify |
| validation | {tests, acceptance} | How to verify the task is done |

---

## Step 1: Write the Plan Draft

Read the approved design.md, then write a plan as a markdown section in the same
document or as a separate draft.

### Plan quality

Write assuming the implementer:
- Knows the language and framework
- Doesn't know this codebase's specific patterns
- Needs clear boundaries and validation criteria
- Will take the path of least resistance if the plan is vague

### Task structure

Each task should be self-contained and include:

- **Inputs**: What you need to know or have before starting (from spec, existing code)
- **Description**: What to build, key design decisions, constraints
- **Files**: Exact paths to create and modify
- **Validation**: Tests that must pass and acceptance criteria

No exact code snippets. No implementation details. The task says WHAT and HOW TO VERIFY,
not HOW to write the code.

### Task ordering

Follow bottom-up dependency ordering:

```
Entity → Repository → Service → Router/Consumer
```

### Task size

Each task should take 15-60 minutes. If larger, decompose into smaller tasks.

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

### Task Tracking

**Preferred:** Use beads for dependency-aware task tracking:
```bash
# Create epic and tasks with dependencies
bd create "Feature: {name}" --label {feature} --type epic
bd create "Task: {name}" --label {feature} --type task --epic {epic-id}
bd dep add --type blocks {task-a} {task-b}  # task-a blocks task-b
```

**Fallback:** If beads is not available, use the harness's native todo system.
The harness provides todo management — use it directly.

### What to do

1. Convert the annotated plan draft into structured plan.json
2. Each task maps to a unit with inputs, description, files, and validation
3. Dependencies between tasks are captured in `depends_on` fields
4. Create tasks using beads (preferred) or harness todos:
   - Create an epic/feature container
   - Add tasks per phase with clear descriptions
   - Mark dependencies between tasks (beads: `bd dep add`, harness: manual ordering)
5. The plan.json is the source of truth for task details; the task tracker
tracks execution state

### Verification

After creating plan.json, verify:
- Every task has an ID and depends_on field
- Dependencies form a valid DAG (no cycles)
- Every task has inputs, description, and validation
- File paths are complete and specific
- Validation criteria are concrete and testable

---

## Handoff

When plan.json is created and tasks exist, the next step is **spec-implement**.

Tell the human:

> "Plan is approved and tasks are created. Ready to start implementation?"
>
> **Autonomous** — I'll work through all tasks, only stopping if blocked.
>
> **Batched** — I'll do 3-5 tasks at a time, then report and wait for feedback.

Do not start implementing. That's spec-implement's job.

If implementation reveals missing tasks, update plan.json. If design is wrong,
loop back to research. See **spec-orchestrator** for iteration patterns.

---

## Quick Reference

| Human says | You do |
|------------|--------|
| "write a plan" / "plan this" | Step 1 → write plan draft, stop |
| "I added notes" | Re-read, address all notes, do NOT implement |
| "don't implement yet" | Update plan only |
| "looks good" / "approved" / "create tasks" | Step 3 → create plan.json + task tracking |
