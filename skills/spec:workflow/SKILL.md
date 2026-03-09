---
name: spec:workflow
description: >
  Use when starting any conversation or task. Establishes skill discipline and routes to the
  correct spec skill. If you think there is even a 1% chance a skill might apply, you ABSOLUTELY
  MUST invoke it. This is not negotiable. This is not optional. You cannot rationalize your way
  out of this. Triggers on every task — building features, fixing bugs, refactoring, writing
  tests, planning, designing, or any non-trivial coding work.
user-invocable: false
---

<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY
MUST invoke the skill.

IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. This is not optional. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

# Spec Workflow

You have skills. You MUST use them. Not "should." Not "when convenient." MUST.

Invoke relevant skills BEFORE any response or action. Even a 1% chance a skill might apply
means you invoke it. If an invoked skill turns out to be wrong for the situation, you don't
need to follow it. But you must check.

## The One Rule

**Never write code until the human has reviewed and approved a written plan.**

Every project goes through this process. A todo list, a single-function utility, a config
change — all of them. "Simple" projects are where unexamined assumptions cause the most
wasted work. The spec can be short, the plan can be brief, but you MUST present them
and get approval.

## Artifacts

Every feature produces two artifacts in `docs/specs/YYYY-MM-DD-<feature>/`:

```
spec.md      ← spec:research (requirements + research + architecture)
plan.json    ← spec:plan (tasks, dependencies → feeds beads)
```

## Skill Routing

```
spec:research    → Discovery + research + architecture → spec.md
spec:plan        → Implementation plan + tasks → plan.json
spec:implement   → Execute tasks, track progress, report
spec:finish      → Post-implementation validation
code:subagents  → Parallel dispatch, two-stage review
oracle:architect → DDD patterns, component responsibilities
oracle:testing   → TDD patterns, boundary testing
```

### "Create a spec for X" / Build / Add Feature

```
spec:research → spec:plan → spec:implement → spec:finish
```

### Fix Complex Bug / Refactor

```
spec:research (research-heavy) → spec:plan (targeted) → spec:implement
```

### Write Tests / Testing Questions

```
oracle:testing
```

### Architecture / Domain Modeling Questions

```
oracle:architect
```

### Quick Fix / Trivial Change

If genuinely trivial (typo, single-line config, variable rename) — skip the pipeline.
But be honest. If there's any doubt, plan it.

## Hard Transitions

| After completing... | The ONLY next step is... |
|---------------------|--------------------------|
| spec:research | spec:plan |
| spec:plan | spec:implement |
| spec:implement | spec:finish |

Do NOT jump from requirements to code. Do NOT jump from research to implementation.

## Red Flags — You Are Rationalizing

| What you're thinking | Why it's wrong |
|----------------------|----------------|
| "This is too simple for a plan" | Simple tasks have the most unexamined assumptions |
| "I already know how to do this" | Knowing how ≠ having the human's approval for how |
| "The human seems impatient" | Wasting time on wrong code is worse than planning |
| "I'll just do a quick prototype" | Prototypes become production. Plan it. |
| "I need to explore the code first" | That's the research phase. Write it in spec.md. |
| "Let me just fix this one thing" | One thing becomes three. Plan it. |
| "I can plan in my head" | Plans in your head can't be reviewed or annotated |
| "This is just a refactor" | Refactors touch more code than features. Plan it. |
| "I'll write the plan after" | Post-hoc plans are fiction. Plan before. |
| "I need more context first" | Skills tell you HOW to gather context. Check first. |
| "The skill is overkill" | Simple things become complex. Use it. |
| "I know what that skill says" | Skills evolve. Read current version. Invoke it. |
| "This feels productive" | Undisciplined action wastes time. Skills prevent this. |

## Skill Types

**Process skills** (spec:research, spec:plan, spec:implement, spec:finish): Follow exactly.
Don't adapt away discipline.

**Knowledge skills** (oracle:architect, oracle:testing): Adapt principles to
context. These inform decisions within the workflow.

Process skills come first. Knowledge skills get invoked by process skills when needed.

## User Instructions

"Add X" or "Fix Y" doesn't mean skip workflows. Instructions say WHAT, not HOW.
The skills define HOW.
