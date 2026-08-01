---
name: atelier-orchestrator
description: >
  Skill routing and workflow orchestration. Selects Inline Plan or Spec-backed Plan, routes
   to the correct workflow skill, and manages transitions between phases. Use when starting
  any conversation or task to determine which planning mode and skill apply.
user-invocable: false
---

<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY
MUST invoke the skill.

IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. This is not optional. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

# Planning Workflow

You have skills. You MUST use them. Not "should." Not "when convenient." MUST.

Invoke relevant skills BEFORE any response or action. Even a 1% chance a skill might apply
means you invoke it. If an invoked skill turns out to be wrong for the situation, you don't
need to follow it. But you must check.

## The One Rule

**When an implementation choice exists, never write code until the human has reviewed and
approved a written plan.** Exact mechanical changes may use the exception below.

The plan may be inline in the conversation or backed by persisted spec artifacts. Select
the mode before invoking an artifact-producing skill, state the choice with one brief
reason, and let the human override it.

## Planning Modes

### Inline Plan (default)

Use for bounded, well-understood work, including ordinary features, bug fixes, refactors,
configuration changes, and multi-file changes. Route to **spec-plan** with Inline mode
explicitly selected. It presents a concise plan in conversation, creates no planning artifacts
or tracker entries, and stops for approval. After approval, implement the plan directly; do
not invoke `spec-implement`, `spec-finish`, or `code-subagents`.

Direct Inline implementation must:

- Avoid main/master unless the human explicitly permits it
- Stay within the approved scope and files
- Run every validation item in the approved plan
- Review the final diff for unintended changes
- Do not commit, push, or open a PR without explicit human instruction

When in doubt, choose Inline Plan. File count and estimated duration alone do not make work
spec-worthy.

### Spec-backed Plan

Use when at least one concrete signal exists:

- The human explicitly requests a spec or durable planning artifacts
- Requirements or boundaries need discovery before planning
- The work materially changes architecture, public contracts, data models, or cross-system behavior
- Multiple dependent subsystems need decomposition and dependency tracking
- The plan must survive the conversation for handoff, audit, or multi-person coordination

Route through **spec-brainstorm**. This mode produces:

```
design.md    ← spec-brainstorm (requirements + research + architecture)
plan.json    ← spec-plan (tasks, dependencies)
```

Do not infer substantial work from size alone. If no concrete signal applies, use Inline Plan.

## Skill Routing

```
atelier-orchestrator → Select and announce planning mode
spec-brainstorm   → Spec-backed discovery + design → design.md
spec-plan         → Inline Plan or Spec-backed Plan → approval
spec-implement    → Execute approved Spec-backed Plans; track tasks
spec-finish       → Post-implementation validation for Spec-backed Plans
code-subagents    → Parallel dispatch for Spec-backed Plan tasks
```

### Ordinary bounded work

```
spec-plan (Inline mode) → approval → implement directly
```

### Substantial work or explicit spec request

```
spec-brainstorm → spec-plan (Spec-backed Plan) → approval → spec-implement → spec-finish
```

### Truly mechanical change

A typo or exact single-line replacement may skip planning when there is no implementation
choice to review. If any choice exists, use an Inline Plan.

## Hard Transitions

| After completing... | Next step |
|---------------------|-----------|
| spec-brainstorm | spec-plan in Spec-backed mode |
| approved Inline Plan | implement the approved plan directly |
| approved Spec-backed Plan | spec-implement in Spec-backed mode |
| spec-implement | spec-finish |

Do not begin implementation without an approved written plan. Spec-backed work must not
jump from research to implementation.

## Iteration Patterns

The workflow is not purely linear. Expect backflows:

### Research → Research (discovery loop)
- Brainstorm reveals new requirements → loop back to discovery phase
- Human adds new scope mid-brainstorm → continue discovery

### Plan → Research (design flaw)
- Planning reveals design assumptions are wrong → back to brainstorm
- Tasks can't be decomposed without more context → back to brainstorm

### Implement → Plan (material changes)
- A minor deviation may be recorded inline and reflected in the plan when it does not change
  approved behavior, scope, architecture, public contracts, or major dependencies.
- Material missing work or an unplanned dependency → revise the active plan and get approval.

### Implement → Research (fundamental issue)
- Inline planning or implementation develops substantial needs → ask the human whether to
  switch to a Spec-backed Plan
- Implementation reveals spec-backed design is fundamentally wrong → back to brainstorm

### Finish → Implement (bugs found)
- Validation finds bugs → back to implement
- Tests failing → back to implement

### When to escalate
If you loop 2+ times on the same issue, stop and ask the human:

> "We've looped on [issue] twice. Should we reconsider the approach?"

## Red Flags — You Are Rationalizing

| What you're thinking | Why it's wrong |
|----------------------|----------------|
| "This is too simple for a persisted spec" | Use an Inline Plan instead |
| "I already know how to do this" | Knowing how ≠ having the human's approval for how |
| "The human seems impatient" | Wasting time on wrong code is worse than planning |
| "I'll just do a quick prototype" | Prototypes become production. Plan it. |
| "I need to explore the code first" | Gather enough context for an Inline Plan; use brainstorm only when discovery is substantial |
| "Let me just fix this one thing" | One thing becomes three. Plan it. |
| "I can plan in my head" | Plans in your head can't be reviewed or annotated |
| "This is just a refactor" | Refactors still need at least an Inline Plan |
| "I'll write the plan after" | Post-hoc plans are fiction. Plan before. |
| "I need more context first" | Skills tell you HOW to gather context. Check first. |
| "The spec workflow is overkill" | It may be. Default to an Inline Plan unless substantial-work signals exist. |
| "I know what that skill says" | Skills evolve. Read current version. Invoke it. |
| "This feels productive" | Undisciplined action wastes time. Skills prevent this. |

## Skill Types

**Process skills** (spec-brainstorm, spec-plan, spec-implement, spec-finish): Follow exactly.
Don't adapt away discipline.

**Knowledge skills** (oracle-grill-me, oracle-domain-modelling): Adapt principles to
context. These inform decisions within the workflow.

**Discipline skills** (oracle-debug): Strict methodology that must be followed
exactly — no adaptation that bypasses root-cause investigation.

Process skills come first. Knowledge skills get invoked by process skills when needed.

## User Instructions

"Add X" or "Fix Y" doesn't mean skip workflows. Instructions say WHAT, not HOW.
The skills define HOW.
