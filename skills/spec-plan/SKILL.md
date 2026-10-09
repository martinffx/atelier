---
name: spec-plan
description: >
  Write approved implementation plans in one of two modes. Explicit Inline mode creates a
  conversational plan for bounded work. Spec-backed Plan converts an approved design.md into
  plan.json. Both modes stop after producing their plan output. Trigger after
  atelier-orchestrator selects a mode, when
  the user asks to plan work, or after spec-brainstorm completes. Direct invocation without a
  selected mode uses Spec-backed Plan. Do NOT use for research or execution.
user-invocable: true
---

# Spec Plan

Write a proportional plan so clear that any engineer can follow it. The selected planning
mode determines whether the plan stays in the conversation or becomes a persisted structured
artifact. This skill does not write code or start implementation.

`atelier-orchestrator` owns automatic classification and the human may override it. When this
skill is directly invoked without a selected mode, use Spec-backed Plan. If Inline planning
reveals substantial design or coordination needs, ask the human whether to switch to a
Spec-backed Plan before presenting the plan.

## Terminal boundary

This skill produces exactly one plan output and then stops:

- Inline mode presents the plan in conversation and changes no repository files.
- Spec-backed mode creates or updates only `plan.json` from an approved `design.md`.

Planning drafts and annotation cycles stay in conversation. Do not modify `design.md`, persist
a Markdown plan draft, create tracker entries, invoke another workflow skill, or edit
implementation files. These rules still apply when the human asks to plan and implement in one
request. Implementation requires a later, explicit request after this skill has finished.

## Planning Rules

- Organize tasks around required behavior, not one task per layer.
- Record a short list of behavior the change must preserve.
- For each task, identify existing code to reuse, modify, or delete.
- Map every new abstraction to a present requirement and its current consumers.
- Introduce shared infrastructure only when at least two current consumers demonstrate the
  same need.
- Group tests by changed contract and active boundary. Do not repeat the CRUD matrix across
  layers.

### Proportionality Gate

Before presenting any plan, compare its size and concepts with the requested behavior. If a
bounded migration or refactor introduces shared infrastructure, unrelated behavior, or a plan
substantially larger than the behavior being changed, stop and simplify it.

### Challenge Gate

Before presenting a plan, dispatch two read-only subagents in parallel with the draft plan and
its design context. Do not name agents; describe the work so the harness matches it to agent
descriptions (see Delegation in `atelier-orchestrator`):

1. **Design review:** check architectural fit, layer and data-model boundaries, API contracts,
   and whether task ordering respects the dependencies.
2. **Critical challenge:** challenge assumptions, look for missing cases, scope creep, and
   unproven requirements, and propose simpler alternatives.

Each returns at most five evidence-backed findings. Fold in the valid ones, drop the rest with a
reason, and present the plan with a short **Challenged** note listing what changed.

Run the gate on every Spec-backed Plan. Run it on an Inline Plan only when the change touches a
data model, an API contract, or more than one module or layer; skip it for small bounded edits.
Run it once per draft; do not re-run it for the human's annotation revisions unless the plan's
structure changes.

## Outputs

### Inline Plan (when explicitly selected)

No repository artifact and no task tracker entry. Read
`references/plan_template.md` and present the plan in conversation using its
structure. Omit optional subsections rather than rendering empty headings.

## Inline Plan Workflow

Read enough of the codebase to identify the current behavior, boundaries, affected files,
and concrete validation. Keep the plan proportional to implementation risk. Fill the
template with confirmed, file-and-symbol-level details, including cross-file wiring or
ordering constraints where they matter. Apply the Planning Rules, Proportionality Gate, and Challenge Gate
before presenting it.

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

When the human approves the Inline Plan, acknowledge that the plan is approved and stop. Do not
implement it in the same invocation. A later explicit implementation request may execute the
approved conversational plan directly using the Inline execution safeguards in
`atelier-orchestrator`; it does not use `spec-implement`, `spec-finish`, `code-subagents`, or
task tracking.

## Spec-backed Plan Artifacts

```
docs/specs/YYYY-MM-DD-<feature-name>/
├── design.md  ← From spec-brainstorm (approved)
└── plan.json  ← This skill's output
```

The plan starts as a conversational draft for human annotation, then gets converted to
structured `plan.json` when approved.

### plan.json Schema

```json
{
  "feature": "user-authentication",
  "spec": "docs/specs/2026-03-08-user-auth/design.md",
  "goal": "Add email/password authentication with session management",
  "preserved_behavior": [
    "Existing sessions remain valid"
  ],
  "phases": [
    {
      "id": "P1",
      "name": "Authenticate with email and password",
      "tasks": [
        {
          "id": "T1",
          "name": "Accept valid credentials and reject invalid credentials",
          "depends_on": [],
          "inputs": [
            "User schema from design.md",
            "Validation rules (email format, password strength)"
          ],
          "description": "Create UserEntity with email and password fields. Implement validation using a Result type. Password must be hashed, never stored plaintext.",
          "files": {
            "reuse": ["src/auth/password.ts"],
            "create": ["src/entities/user.ts", "tests/entities/user.test.ts"],
            "modify": [],
            "delete": []
          },
          "new_abstractions": [
            {
              "name": "UserEntity",
              "requirement": "Validate email/password credentials",
              "consumers": ["POST /sessions"]
            }
          ],
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
| preserved_behavior | string[] | Short list of existing behavior that must remain unchanged |
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
| files | {reuse, create, modify, delete} | Existing code to reuse, modify, or delete, plus files to create |
| new_abstractions | {name, requirement, consumers}[] | New abstractions mapped to a present requirement and current consumers |
| validation | {tests, acceptance} | How to verify the task is done |

---

## Spec-backed Step 1: Write the Plan Draft

Read the approved `design.md`, apply the Challenge Gate to the draft, then present the plan
draft in conversation. Do not write the draft into `design.md` or create a separate draft file.

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
- **Files**: Exact existing code to reuse, modify, or delete, and files to create
- **New abstractions**: Present requirement and current consumers for each; use an empty list
  when the task adds none
- **Validation**: Tests grouped by changed contract and active boundary, plus acceptance criteria

No exact code snippets. No implementation details. The task says WHAT and HOW TO VERIFY,
not HOW to write the code.

### Task ordering

Order tasks by required behavior and real dependencies. Keep changes across layers in one task
when they implement and verify one contract; do not create one task per layer.

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

### What to do

1. Convert the annotated plan draft into structured plan.json
2. Each task maps to a unit with inputs, description, files, and validation
3. Dependencies between tasks are captured in `depends_on` fields
4. Do not create tracker entries or modify any file other than `plan.json`

### Verification

After creating plan.json, verify:
- Every task has an ID and depends_on field
- Dependencies form a valid DAG (no cycles)
- Every task has inputs, description, and validation
- Preserved behavior is short and explicit
- Every task identifies code to reuse, modify, or delete
- Every new abstraction names its present requirement and current consumers
- Shared infrastructure has at least two current consumers with the same demonstrated need
- File paths are complete and specific
- Validation criteria are concrete, testable, and grouped by changed contract and active boundary
- The plan passes the Proportionality Gate

---

## Handoff

When `plan.json` is created, report its path and stop.

Tell the human:

> "Planning complete. Plan written to `docs/specs/<path>/plan.json`. A separate
> `spec-implement` invocation can execute it."

Do not invoke `spec-implement`, offer execution modes, or start implementing. The human must
start implementation with a separate request.

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
| Inline / "approved" | Acknowledge approval and stop; create no artifacts and do not implement |
| Spec-backed / "write a plan" | Write the plan draft from design.md, stop |
| Spec-backed / "I added notes" | Re-read, address all notes, do NOT implement |
| Spec-backed / "approved" / "create tasks" | Create only plan.json, report its path, and stop |
