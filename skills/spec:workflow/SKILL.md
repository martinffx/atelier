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
wasted work. The design can be short, the plan can be brief, but you MUST present them
and get approval.

## Skill Routing

```
spec:product     → Requirements discovery, scope, user stories
spec:design      → Research codebase, architecture decisions, design.md
spec:plan        → Implementation plan, annotation cycles, task creation
spec:implement   → Execute tasks, track progress, report
spec:architect   → DDD patterns, component responsibilities (knowledge)
spec:testing     → TDD patterns, boundary testing (knowledge)
```

### Build / Create / Add Feature

```
spec:product → spec:design → spec:plan → spec:implement
```

1. **spec:product** — What problem? For whom? What's in scope? What's out?
2. **spec:design** — Research the codebase, design the solution, write research.md + design.md
3. **spec:plan** — Write implementation plan, annotate with human, create tasks
4. **spec:implement** — Execute tasks, track progress, report

Skip spec:product only if the human arrives with complete requirements.
Skip spec:design only if the human arrives with an approved design.

### Plan / Design / Architect

```
spec:design → spec:plan → spec:implement
```

The human knows what they want. They need the codebase researched and the work planned.

### Fix Complex Bug / Refactor

```
spec:design (research-heavy) → spec:plan (targeted) → spec:implement
```

The research phase is critical. Find the root cause or understand the current structure
before planning the fix.

### Write Tests / Testing Questions

```
spec:testing
```

### Architecture / Domain Modeling Questions

```
spec:architect
```

### Quick Fix / Trivial Change

If genuinely trivial (typo, single-line config, variable rename) — skip the pipeline. But
be honest. If there's any doubt, plan it.

## Hard Transitions

Skills chain in a specific order. Don't skip steps. Don't reorder.

| After completing... | The ONLY next step is... |
|---------------------|--------------------------|
| spec:product | spec:design |
| spec:design | spec:plan |
| spec:plan | spec:implement |

Do NOT jump from requirements to code. Do NOT jump from research to implementation.
The pipeline exists because each phase catches errors the next phase would compound.

## Red Flags — You Are Rationalizing

These thoughts mean STOP. You are about to skip a skill.

| What you're thinking | Why it's wrong |
|----------------------|----------------|
| "This is too simple for a plan" | Simple tasks have the most unexamined assumptions |
| "I already know how to do this" | Knowing how ≠ having the human's approval for how |
| "The human seems impatient" | Wasting time on wrong code is worse than planning |
| "I'll just do a quick prototype" | Prototypes become production. Plan it. |
| "I need to explore the code first" | That's the research phase. Write it in research.md. |
| "Let me just fix this one thing" | One thing becomes three. Plan it. |
| "I can plan in my head" | Plans in your head can't be reviewed or annotated |
| "This is just a refactor" | Refactors touch more code than features. Plan it. |
| "I'll write the plan after" | Post-hoc plans are fiction. Plan before. |
| "I need more context first" | Skills tell you HOW to gather context. Check first. |
| "The skill is overkill" | Simple things become complex. Use it. |
| "I know what that skill says" | Skills evolve. Read current version. Invoke it. |
| "This feels productive" | Undisciplined action wastes time. Skills prevent this. |

## Skill Types

**Process skills** (spec:design, spec:plan, spec:implement): Follow exactly. These drive
the workflow. Don't adapt away discipline.

**Knowledge skills** (spec:architect, spec:testing, spec:product): Adapt principles to
context. These inform decisions within the workflow.

Process skills come first. Knowledge skills get invoked by process skills when needed.

## Invoking Skills

Announce briefly when invoking a skill:

> "Starting with codebase research — writing up findings in research.md."

> "Plan's approved. Picking up tasks and implementing."

Don't narrate the meta-process. Don't explain the skill system. Just use it.

## User Instructions

"Add X" or "Fix Y" doesn't mean skip workflows. Instructions say WHAT, not HOW.
The skills define HOW.
