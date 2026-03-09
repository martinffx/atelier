---
name: spec:research
description: >
  Discovery, research, and architecture for new features. Produces spec.md — a living
  specification that covers what exists, what we're building, and how it fits together.
  Combines requirements discovery with codebase research and design. Use when the user says
  "create a spec", "what should we build", "design this feature", or at the start of any
  feature/refactor/complex-bug workflow.
user-invocable: true
---

# Spec Research

Discovery + Research + Architecture = spec.md

One skill to understand what to build, what exists, and how to build it. Get approval.
Then move to planning.

## Artifact

```
docs/specs/YYYY-MM-DD-<feature-name>/
└── spec.md  ← This skill's output
```

Requirements are inline in spec.md — no separate requirements.json needed.

---

## Step 1: Orient

Before diving in, understand where you are.

1. **Read project context** — AGENTS.md, README, existing architecture docs
2. **Check existing specs** — Scan `docs/specs/` for previous work. What domain model
   exists? What patterns are established? What has been built before?
3. **Read recent specs** — What was the last thing built? Is this new feature building
   on existing work, extending it, or something greenfield?

This is silent — don't narrate it. Let the context inform where you focus your research.

---

## Step 2: Discovery (if needed)

Ask questions to understand what to build. Skip this step if requirements are already clear
from context (existing specs, human provided details, etc.).

### When to do discovery

- Problem space is unclear
- New feature with new users/workflows
- Human says "what should we build", "let's figure out requirements"

### When to skip

- Human provides clear requirements
- Feature extends existing work with clear scope
- "I want to spec out X" — already has context

### Questions (if needed)

Ask one at a time. Don't overwhelm with a wall of questions.

1. **What problem are we solving?** — Concrete problem statement, not solution description
2. **Who has this problem?** — User roles
3. **How do they solve it today?** — Current workflow and pain points
4. **What does success look like?** — Measurable outcomes
5. **What does this integrate with?** — Existing systems, APIs
6. **What constraints exist?** — Technical, business, regulatory

If you already know answers from orientation, confirm rather than ask.

**Tell the human:** "Based on my research, here's my understanding of what we're building.
Does this look right?"

**STOP. Wait for human confirmation.**

---

## Step 3: Research

Read the relevant codebase deeply. Not signatures — implementations, edge cases, error
handling, data flows. Trace callers and callees. Read tests to understand expected behaviour.

Write findings directly into spec.md as the foundation.

**Tell the human:** "I've written the research section of spec.md. Ready for you to review
before I continue with the design."

**STOP. Wait for human review.**

---

## Step 4: Design

Once research is approved, build spec.md with architecture and design decisions.

Use the Skill tool to invoke **oracle:architect** for component design, domain modeling,
and layer boundaries.

### What spec.md should contain

```markdown
# Feature Name

## Problem
- What problem are we solving
- Who has this problem
- How they solve it today

## Scope
- **In scope:** [specific capabilities]
- **Out of scope:** [explicitly deferred]

## User Stories
- US-1: As a [role], I want [action], so that [benefit]
  - Given X, when Y, then Z
- Priority: must/should/could

## Constraints
- [Technical or business constraints]

## Context
- What exists today, how it works end-to-end
- Existing patterns and conventions
- Dependencies and integration points
- Gotchas, assumptions, technical debt

## Architecture
- Component structure (functional core / effectful edge)
- Domain model: entities, value objects, aggregates
- Where business logic lives, where IO lives

## API Design
- Endpoints, request/response contracts
- Error handling approach
- Event contracts (published/consumed)

## Data Model
- Schema design, access patterns
- Migrations needed

## Trade-offs
- Alternatives considered
- Why this approach wins
- Known limitations

## Open Questions
- Anything unresolved needing human input
```

Scale each section to complexity — a few sentences if straightforward, detailed if nuanced.

### Reference implementations

If human provides reference code — from open source, from elsewhere in codebase — use it
as a concrete guide. Working from a reference produces dramatically better designs.

**Tell the human:** "spec.md is complete. Ready for your review."

**STOP. Wait for human review.**

---

## Step 5: Annotation

Human may annotate spec.md directly — adding corrections, rejections, domain knowledge,
or "remove this section entirely."

When they say "I added notes":

1. Re-read the full document
2. Address every note
3. Update the spec
4. **Do not move to planning**

This may repeat 1-6 times. Spec is not approved until human explicitly says so.

---

## Handoff

When spec.md is approved, the next step is **spec:plan**.

> "Spec is approved. Ready to write the implementation plan?"

If planning reveals design flaws, loop back to research. See **spec:orchestrator**
for iteration patterns.

Do not start planning without explicit approval. Do not write code.
