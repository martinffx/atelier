---
name: spec:product
description: >
  Requirements discovery and scope definition. Produces requirements.json — structured scope,
  user stories, acceptance criteria, and constraints. Use when gathering requirements, starting
  a new feature, defining what to build, or when the problem space is unclear. Trigger when
  the user says "what should we build", "let's figure out requirements", "I have an idea for",
  or at the start of any new feature workflow. Do NOT use when requirements are already clear
  and the user wants to jump to design.
user-invocable: true
---

# Spec Product

Figure out what to build before figuring out how to build it. Ask questions, define scope,
extract stories, produce requirements.json.

## Artifact

```
docs/specs/YYYY-MM-DD-<feature-name>/
└── requirements.json  ← This skill's output
```

Create the directory at the start. See [references/schemas.md](references/schemas.md) for
the requirements.json schema.

---

## Step 1: Orient

Before asking a single question, understand where you are.

1. **Read project context** — CLAUDE.md, README, project docs. Understand the product,
   tech stack, and domain.
2. **Check existing specs** — Scan `docs/specs/` for previous work. What features exist?
   What domain model is established? What patterns and conventions have been set?
3. **Read recent specs** — What was the last thing built? Is this new feature building
   on existing work, extending it, or something greenfield?
4. **Note what you already know** — After orienting, you may already have answers to
   half the discovery questions. Don't ask questions you can answer from context.

This step is silent — don't narrate it. Just read, absorb, and let it inform how much
discovery the human actually needs to do.

---

## Step 2: Discovery

Ask questions one at a time. Don't overwhelm with a wall of questions — this is a
conversation, not a form. Scale the questioning to the gap between what you learned in
orientation and what you still need to know.

### Core questions (ask in order, skip what you already know)

1. **What problem are we solving?** — Get a concrete problem statement, not a solution description.
2. **Who has this problem?** — Identify user roles.
3. **How do they solve it today?** — Understand the current workflow and pain points.
4. **What does success look like?** — Define measurable outcomes.
5. **What does this integrate with?** — Existing systems, data sources, APIs.
6. **What constraints exist?** — Technical, business, regulatory, timeline.

If orientation gave you clear answers, confirm rather than ask: "Based on the existing
specs, this would integrate with the auth system and the user entity we built last month.
Does that sound right?"

Stop when you have enough to define scope.

---

## Step 3: Define Scope

Based on discovery, define clear boundaries.

### In scope
Core functionality that delivers the primary value. Critical user journeys. Essential
integrations. Must-have business rules. Be specific — "user authentication" is vague,
"email/password login with session management" is concrete.

### Out of scope
Explicitly list what we are NOT building. This is just as important as what's in scope.
It prevents scope creep and sets expectations. Nice-to-haves, future iterations, advanced
use cases — name them and defer them.

### MVP criteria
What is the minimum that delivers value? What can be learned and iterated on?

---

## Step 4: Extract Stories

Convert discovery into user stories with acceptance criteria.

```
As a [role]
I want to [action]
So that [benefit]
```

Each story gets Given/When/Then acceptance criteria. Each story gets a MoSCoW priority:
**must**, **should**, **could**, **wont**.

Decompose large stories into smaller pieces that deliver independent value. Order by
dependency and risk — tackle high-risk assumptions early.

---

## Step 5: Write requirements.json

Structure everything into requirements.json:

```json
{
  "feature": "feature-name",
  "problem": "One-sentence problem statement",
  "users": ["role-1", "role-2"],
  "scope": {
    "in": ["Specific capability 1", "Specific capability 2"],
    "out": ["Deferred thing 1", "Deferred thing 2"]
  },
  "stories": [
    {
      "id": "US-1",
      "role": "role-1",
      "action": "what they want to do",
      "benefit": "why they want to do it",
      "priority": "must",
      "acceptance": [
        "Given X, when Y, then Z"
      ]
    }
  ],
  "constraints": ["Technical or business constraints"],
  "dependencies": ["Prerequisites or external dependencies"]
}
```

**Tell the human:** "Requirements are drafted. Ready for your review."

**STOP. Wait for human review.**

---

## Step 6: Iterate

The human may push back on scope, reprioritise stories, add constraints, or cut features.
Update requirements.json accordingly. This may take a few rounds.

When the human approves, the requirements are locked for this iteration.

---

## Handoff

When requirements.json is approved, the next step is **spec:design**.

> "Requirements are approved. Ready to research the codebase and design the solution?"

Do not start designing. Do not write code. That's spec:design's job.
