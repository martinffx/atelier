---
name: spec-brainstorm
description: >
  Conversational design workshop for new features. Interviews the human one question
  at a time, explores 2-3 approaches with trade-offs, then produces a focused spec.
  Combines requirements discovery with codebase research and architecture design.
  Use when the user says "create a spec", "design this feature", "let's brainstorm",
  "what should we build", or at the start of any feature/refactor/complex-bug workflow.
user-invocable: true
argument-hint: <topic or feature description>
---

# Spec Brainstorm

Conversational design workshop that produces a focused, reviewed spec.

One question at a time. Multiple approaches explored. Ruthless scope control.
No implementation until design is approved.

## Artifact

```
docs/specs/YYYY-MM-DD-<topic>-design.md  ← This skill's output
```

Requirements are inline — no separate requirements.json needed.

---

## Lessons

These principles apply to every spec, every time.

### "Too simple for a design" is an anti-pattern

Every project goes through this process. No exceptions. The five-minute conversation
often reveals assumptions that would cost hours in implementation. If it's truly trivial,
the spec will be short — but it still gets written.

### Design for isolation and clarity

Break the system into units with one clear purpose each. Well-defined interfaces between
them. Each unit independently understandable and independently testable. If you can't
explain a unit's job in one sentence, it's doing too much.

### Working in existing codebases

Explore the current structure first. Follow existing patterns. Targeted improvements only.
No unrelated refactoring. Understand why things are the way they are before proposing
changes.

### Decomposition

If the request describes multiple independent subsystems, flag it immediately. Decompose
into sub-projects before diving into details. Each sub-project gets its own spec and its
own plan. A spec that tries to cover three subsystems helps no one.

### YAGNI ruthlessly

Remove unnecessary features from all designs. If a capability isn't needed for the first
user story, it doesn't go in the spec. Every feature is a cost — to build, to test,
to maintain, to understand later. Push back on scope creep during discovery.

---

## Step 1: Orient

Before diving in, understand where you are.

1. **Read project context** — AGENTS.md, README, existing architecture docs
2. **Check existing specs** — Scan `docs/specs/` for previous work. What domain model
   exists? What patterns are established? What has been built before?
3. **Read recent specs** — What was the last thing built? Is this feature building
   on existing work, extending it, or something greenfield?

This is silent — don't narrate it. Let the context inform where you focus.

---

## Step 2: Discovery

Ask questions to understand what to build. Skip this step if requirements are already
clear from context (existing specs, human provided details, etc.).

### Interview style

Ask **one question at a time**. Multiple choice preferred when possible — give 2-4
concrete options rather than open-ended prompts. Keep the conversation moving.

**Good:** "Should this be real-time or batch-processed? (a) Real-time via WebSocket,
(b) Periodic polling every 30s, (c) On-demand when user requests it."

**Bad:** "How should the data synchronization work?"

### When to skip discovery

- Human provides clear, detailed requirements
- Feature extends existing work with well-defined scope
- Human says "spec out X" and X is specific enough

### Decomposition check

Before asking any detail questions, assess scope. If the request describes multiple
independent subsystems (e.g., "build a notification system with email, SMS, push, and
an admin dashboard"):

1. **Flag it immediately:** "This looks like multiple independent projects. Let me
   propose a decomposition."
2. **Break it down:** Identify the subsystems and their dependencies.
3. **Get agreement:** "Which of these should we spec first?"

Do not try to spec everything in one document.

### YAGNI check

During discovery, push back on scope:

- "Do you need this in the first version, or is it a nice-to-have?"
- "Can we ship without this and add it later if needed?"
- "This feature adds significant complexity — is the use case real or hypothetical?"

If the human insists, include it — but flag the trade-off in the spec.

### Discovery questions

Adapt these to context. Not all are needed every time.

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
handling, data flows. Trace callers and callees. Read tests to understand expected
behaviour.

Write findings directly into the spec as the foundation.

**Tell the human:** "I've written the research section of the spec. Ready for you to
review before I continue with the design."

**STOP. Wait for human review.**

---

## Step 4: Design — Explore Approaches

Before settling on a design, present **2-3 approaches** with trade-offs.

### Approach exploration

For each approach, address:

1. **What it looks like** — Brief architecture sketch
2. **Pros** — What makes this approach good
3. **Cons** — What's painful, expensive, or risky
4. **Complexity estimate** — Rough sense of implementation effort

Then make a recommendation and explain why.

**Example:**

> **Approach A: Single table with JSON columns**
> - Simple schema, fast to implement
> - Querying inside JSON is limited, migration pain later
> - Complexity: Low
>
> **Approach B: Normalized relational tables**
> - Clean queries, easy to evolve schema
> - More joins, more migration files, more code
> - Complexity: Medium
>
> **Recommendation:** Approach B — the query flexibility matters more here than
> implementation speed.

### Design approval gate

Get explicit approval on the chosen approach before writing the full spec.

**Tell the human:** "Which approach should we go with? Or should I explore a different
direction?"

**STOP. Wait for human to choose an approach.**

### Write the spec

Once an approach is chosen, write the full spec document.

Use the Skill tool to invoke **oracle-architect** for component design, domain modeling,
and layer boundaries.

### What the spec should contain

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

Scale each section to complexity — a few sentences if straightforward, detailed if
nuanced.

### Reference implementations

If human provides reference code — from open source, from elsewhere in codebase — use it
as a concrete guide. Working from a reference produces dramatically better designs.

---

## Step 5: Self-Review

Before presenting the spec to the human, run this checklist silently:

### 1. Placeholder scan

Are there any TBD, TODO, FIXME, or incomplete sections? Every section should have real
content or be removed.

### 2. Internal consistency

Do sections contradict each other? If the Architecture section says "stateless" but the
Data Model includes session state, resolve the conflict before presenting.

### 3. Scope check

Is this focused enough for a single implementation plan? If the spec covers more than
one independent subsystem, it should have been decomposed in Step 2. If it's still too
broad, flag it now.

### 4. Ambiguity check

Could any requirement be interpreted two ways? If so, pick one interpretation, state it
explicitly, and let the human correct you.

Fix any issues found. Then present.

**Tell the human:** "The spec is complete. Ready for your review."

**STOP. Wait for human review.**

---

## Step 6: Annotation

Human may annotate the spec directly — adding corrections, rejections, domain knowledge,
or "remove this section entirely."

When they say "I added notes":

1. Re-read the full document
2. Address every note
3. Update the spec
4. Run the self-review checklist again (Step 5)
5. **Do not move to planning**

This may repeat 1-6 times. Spec is not approved until human explicitly says so.

---

## Handoff

When the spec is approved, the next step is **spec-plan**.

> "Spec is approved. Ready to write the implementation plan?"

If planning reveals design flaws, loop back to research. See **spec-orchestrator**
for iteration patterns.

Do not start planning without explicit approval. Do not write code.
