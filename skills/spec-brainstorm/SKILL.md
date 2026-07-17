---
name: spec-brainstorm
description: >
  Conversational design workshop for new features. Interviews the human one question
  at a time, explores 2-3 approaches with trade-offs, and presents the design
  section by section for approval before writing the spec. Combines requirements
  discovery with codebase research and architecture design.
  Use when the user says "create a spec", "design this feature", "let's brainstorm",
  "what should we build", or at the start of any feature/refactor/complex-bug workflow.
user-invocable: true
argument-hint: <topic or feature description>
---

# Spec Brainstorm

Conversational design workshop that produces a focused, reviewed spec.

One question at a time. Multiple approaches explored. Design approved in
sections. Ruthless scope control. No implementation until design is approved.

## Artifact

```
docs/specs/YYYY-MM-DD-<feature>/
└── design.md  ← This skill's output
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

## Step 4: Design

Design happens in three phases: explore approaches, present the design in sections,
then write the spec file.

### 4a. Explore approaches

Before settling on a design, present **2-3 approaches** with trade-offs.

For each approach, address:

1. **What it looks like** — Brief architecture sketch
2. **Pros** — What makes this approach good
3. **Cons** — What's painful, expensive, or risky
4. **Complexity estimate** — Rough sense of implementation effort

Lead with your recommended option and explain why it wins.

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

Get explicit approval on the chosen approach before presenting the design.

**Tell the human:** "Which approach should we go with? Or should I explore a
different direction?"

**STOP. Wait for human to choose an approach.**

### 4b. Present the design in sections

Present the design in batches. Get approval after each batch before continuing.

Sections already confirmed in earlier steps (Problem, Scope, Constraints, Context)
are written into the spec from those confirmations — do not re-present them.

**Batch A: User Stories** — the contract you're designing against. Formal stories
with acceptance criteria and priorities. If rejected: revise. If the rejection
reveals a scope misunderstanding, loop back to Discovery (Step 2).

**Batch B: Architecture** — component design, domain modeling, and layer
boundaries. Use `python-architecture` or `typescript-api-design` as relevant to
your stack. Then present: component structure, domain model, where business
logic lives, where IO lives. If rejected: revise. If the rejection undermines
the chosen approach, offer to return to approach exploration (4a). If it
reveals a fundamental gap, loop back to Research (Step 3). If the detail reveals
the work is far more complex than estimated, say so and offer to revisit the
approach.

**Batch C: API Design + Data Model** — contracts derived from the approved
architecture. Skip sections that don't apply, but say so explicitly ("No API
changes — moving to Trade-offs"). Never skip silently. If rejected: revise. If
the rejection implicates the architecture, go back to Batch B.

**Batch D: Trade-offs + Open Questions** — alternatives considered, why this
approach wins, known limitations, anything unresolved. Usually revisable inline.

Each batch ends with:

**Tell the human:** "Does this look right?"

**STOP. Wait for approval before continuing.**

If you loop twice on the same batch, stop and ask:

> "We've looped on [batch] twice. Should we reconsider the approach?"

**Terminology discipline:** while drafting batches, challenge terms against
`CONTEXT.md` and update it inline as terms resolve, using the **oracle-domain-modelling**
skill. If domain confusion runs deep, suggest pausing for **oracle-grill-me** before continuing.

### 4c. Write the spec

Once all batches are approved, write the full spec document.

#### What the spec should contain

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

#### Reference implementations

If the human provides reference code — from open source, from elsewhere in the
codebase — use it as a concrete guide. Working from a reference produces
dramatically better designs.

#### Self-review

After writing the file, check it with fresh eyes:

1. **Placeholder scan** — Any TBD, TODO, FIXME, or incomplete sections? Every
   section should have real content or be removed.
2. **Internal consistency** — Do sections contradict each other? If the
   Architecture section says "stateless" but the Data Model includes session
   state, resolve the conflict.
3. **Scope check** — Is this focused enough for a single implementation plan?
   If the spec covers more than one independent subsystem, it should have been
   decomposed in Step 2. If it's still too broad, flag it now.
4. **Ambiguity check** — Could any requirement be interpreted two ways? If so,
   pick one interpretation, state it explicitly, and let the human correct you.

**Substance rule:** if a fix changes the substance of an approved section,
re-present that section for approval. Wording and consistency fixes go inline —
note them at handoff.

---

## Step 5: Handoff

**Tell the human:**

> "Spec written to `docs/specs/<path>`. Every section was approved during our
> conversation — review it if you'd like, or we can go straight to the
> implementation plan. Ready for spec-plan?"

If the human requests changes — in conversation or by annotating the file —
address every note, update the spec, and re-run the self-review. If a change
alters the substance of an approved section, re-present that section for
approval before continuing.

The next step is **spec-plan**. Do not start planning without the human's
go-ahead. Do not write code.

If planning reveals design flaws, loop back to research. See **spec-orchestrator**
for iteration patterns.
