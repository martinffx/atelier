---
name: spec-plan
description: >
  Write approved implementation plans in one of two modes. Explicit Inline mode creates a
  conversational plan for bounded work. Spec-backed Plan converts an approved design.md into
  plan.json and optional tracked tasks. Trigger after atelier-orchestrator selects a mode, when
  the user asks to plan work, or after spec-brainstorm completes. Direct invocation without a
  selected mode uses Spec-backed Plan. Do NOT use for research or execution.
user-invocable: true
---

# Spec Plan

Write a proportional plan so clear that any engineer can follow it. The selected planning
mode determines whether the plan stays in the conversation or becomes a persisted structured
artifact. This skill does not write code.

`atelier-orchestrator` owns automatic classification and the human may override it. When this
skill is directly invoked without a selected mode, use Spec-backed Plan. If Inline planning
reveals substantial design or coordination needs, ask the human whether to switch to a
Spec-backed Plan before presenting the plan.

## Outputs

### Inline Plan (when explicitly selected)

No repository artifact and no task tracker entry. Read
`references/plan_template.md` and present the plan in conversation using its
structure. Omit optional subsections rather than rendering empty headings.

## Inline Plan Workflow

Read enough of the codebase to identify the current behavior, boundaries, affected files,
and concrete validation. Keep the plan proportional to implementation risk. Fill the
template with confirmed, file-and-symbol-level details, including cross-file wiring or
ordering constraints where they matter.

Do not manufacture phases, task IDs, dependency graphs, acceptance matrices, `design.md`,
`plan.json`, tracker entries, or harness todos. The conversation is the plan artifact.

**Tell the human:** "Inline Plan ready for review."

**STOP. Wait for human review.**

If the human requests any adjustment, apply it to the working plan and re-present the
entire updated plan using `references/plan_template.md`. Include unchanged sections so
the human reviews one coherent plan. Never respond with only the changed text, an
affected section, a summary, or an acknowledgement. A one-word correction is still a
plan revision: incorporate it and present the complete plan again.

Every revision invalidates prior approval. End each revised plan with "Inline Plan ready
for review." and stop until the human explicitly approves that complete version. Do not
implement until the current plan is approved.

Approval authorizes implementation. Implement the approved conversational plan directly using
the Inline execution safeguards in `atelier-orchestrator`. Do not invoke `spec-implement`,
`spec-finish`, `code-subagents`, or task tracking.

Do not create planning artifacts or tracker entries during this handoff.

## Spec-backed Plan Artifacts

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

## Spec-backed Step 1: Write the Plan Draft

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

## Spec-backed Step 2: The Annotation Cycle

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

## Spec-backed Step 3: Create Structured Tasks

When the human approves — "looks good", "approved", "create tasks" — convert the plan
into plan.json.

### Task Tracking

Read `docs/agents/issue-tracker.md` when it exists. Create tracker entries only when that
document configures a tracker, mirroring is enabled, and tracking adds execution value. Do not
choose or configure a tracker here. Do not duplicate a simple plan.json into a tracker merely to
satisfy the workflow.

### What to do

1. Convert the annotated plan draft into structured plan.json
2. Each task maps to a unit with inputs, description, files, and validation
3. Dependencies between tasks are captured in `depends_on` fields
4. When execution benefits from configured task tracking, create entries according to
   `docs/agents/issue-tracker.md`:
   - Create any configured feature container
   - Add tasks with clear descriptions
   - Mirror dependencies when the configured tracker supports them
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

When plan.json is created, and any useful configured tracker entries have been created, the next
step is **spec-implement** in Spec-backed mode.

Tell the human:

> "Spec-backed Plan is approved. Ready to start implementation?"
>
> **Autonomous** — I'll work through all tasks, only stopping if blocked.
>
> **Batched** — I'll do 3-5 tasks at a time, then report and wait for feedback.

Do not start implementing. That's spec-implement's job.

Minor implementation deviations may be recorded inline and reflected in plan.json when they do
not change approved behavior, scope, architecture, public contracts, or major dependencies.
Material changes return to spec-plan for renewed approval; design changes return to
spec-brainstorm. See **atelier-orchestrator** for iteration patterns.

---

## Quick Reference

| Selected mode / human says | You do |
|----------------------------|--------|
| Inline / "write a plan" | Present the complete Inline Plan from the template, stop |
| Inline / "I added notes" | Apply the changes, re-present the entire updated Inline Plan, and stop for renewed approval |
| Inline / "approved" | Implement the approved conversational plan directly; create no artifacts |
| Spec-backed / "write a plan" | Write the plan draft from design.md, stop |
| Spec-backed / "I added notes" | Re-read, address all notes, do NOT implement |
| Spec-backed / "approved" / "create tasks" | Create plan.json and useful task tracking |
