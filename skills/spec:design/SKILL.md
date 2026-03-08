---
name: spec:design
description: >
  Research codebase and design solutions. Produces spec.md — the living specification that
  covers what exists, what we're building, and how it fits together. Trigger when the user
  says "create a spec", "research this", "design this feature", "how should we build this",
  or at the start of any feature/refactor/complex-bug workflow. Do NOT use when the spec
  is already approved and the user just wants a plan.
user-invocable: true
---

# Spec Design

Research what exists. Decide what to build. Write it all in one living document — spec.md.
Get approval. Then move to planning.

## Artifact

```
docs/specs/YYYY-MM-DD-<feature-name>/
├── requirements.json  ← From spec:product (if applicable)
└── spec.md            ← This skill's output
```

Create the directory at the start. If requirements.json exists, read it first — it defines
scope, user stories, and acceptance criteria.

---

## Step 1: Orient

Before diving into research, understand the project context.

1. **Read project docs** — CLAUDE.md, README, existing architecture docs
2. **Check existing specs** — Scan `docs/specs/` for previous work. What domain model
   exists? What patterns are established? What has been built before?
3. **Read requirements.json** — If it exists, this defines what we're building and why

This is silent — don't narrate it. Let the context inform where you focus your research.

---

## Step 2: Research

Read the relevant codebase deeply. Not signatures — implementations, edge cases, error
handling, data flows. Trace callers and callees. Read tests to understand expected behaviour.

Write your findings directly into spec.md as the foundation of the document. Don't produce
a separate research artifact — the research IS the first part of the spec.

**Tell the human:** "I've written the research section of spec.md. Ready for you to review
before I continue with the design."

**STOP. Wait for human review.**

---

## Step 3: Design

Once the human approves the research section, continue building spec.md with architecture
and design decisions.

Invoke **spec:architect** for component design, domain modeling, and layer boundaries.

### What spec.md should contain (complete document)

```markdown
# Feature Name

## Context
- What exists today, how it works end-to-end
- Existing patterns and conventions
- Dependencies and integration points
- Gotchas, assumptions, technical debt

## Requirements
- What we're building and why (reference requirements.json if exists)
- What's in scope, what's explicitly out
- Key user journeys

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

Scale each section to its complexity — a few sentences if straightforward, detailed if
nuanced. Don't pad simple features with unnecessary sections.

### Reference implementations

If the human provides reference code — from an open source repo, from elsewhere in the
codebase — use it as a concrete guide. Working from a reference produces dramatically
better designs than working from scratch.

**Tell the human:** "spec.md is complete. Ready for your review."

**STOP. Wait for human review.**

---

## Step 4: Annotation

The human may annotate spec.md directly — adding corrections, rejections, domain knowledge,
or "remove this section entirely." When they say "I added notes":

1. Re-read the full document
2. Address every note
3. Update the spec
4. **Do not move to planning**

This may repeat 1-6 times. The spec is not approved until the human explicitly says so.

---

## Handoff

When spec.md is approved, the next step is **spec:plan**.

> "Spec is approved. Ready to write the implementation plan?"

Do not start planning without explicit approval. Do not write code.
