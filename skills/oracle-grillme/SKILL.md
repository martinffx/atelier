---
name: oracle-grillme
description: >
  Socratic interrogation of plans against the project's domain model and documented decisions.
  Use when the user wants to stress-test a plan, clarify terminology, or validate assumptions
  against existing domain language. Updates CONTEXT.md and ADRs inline as decisions crystallise.
user-invocable: true
---

# Grill Me

Relentless questioning of your plan against the project's domain model, sharpening terminology and updating documentation (CONTEXT.md, ADRs) inline as decisions crystallise.

## When to Use

- **Stress-testing a plan** — "I want to add a refund flow to the Order service"
- **Clarifying fuzzy language** — "We're calling it 'account' but is that a Customer or a User?"
- **Onboarding to a domain** — "Walk me through how the Billing context relates to Ordering"
- **Before writing specs** — Ensuring the domain language is solid before `spec-brainstorm` begins
- **After code review** — "The PR introduces 'cancellation' but our glossary says..."

## When NOT to Use

- **Simple implementation questions** — Use `spec-brainstorm` instead
- **Debugging** — Use `oracle-debug`
- **Already in spec workflow** — Use `spec-brainstorm` for domain discovery

---

## How It Works

<interview-loop>

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time, waiting for feedback on each question before continuing.

If a question can be answered by exploring the codebase, explore the codebase instead.

</interview-loop>

---

## Domain Awareness

### Discovering Context

Most repos have a single context:

```
/
├── CONTEXT.md
├── docs/
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

If a `CONTEXT-MAP.md` exists at the root, the repo has multiple contexts. The map points to where each one lives:

```
/
├── CONTEXT-MAP.md
├── docs/
│   └── adr/                          ← system-wide decisions
├── src/
│   ├── ordering/
│   │   ├── CONTEXT.md
│   │   └── docs/adr/                 ← context-specific decisions
│   └── billing/
│       ├── CONTEXT.md
│       └── docs/adr/
```

Create files lazily — only when you have something to write. If no `CONTEXT.md` exists, create one when the first term is resolved. If no `docs/adr/` exists, create it when the first ADR is needed.

### During the Session

#### Challenge Against the Glossary

When the user uses a term that conflicts with the existing language in `CONTEXT.md`, call it out immediately.

> "Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"

#### Sharpen Fuzzy Language

When the user uses vague or overloaded terms, propose a precise canonical term.

> "You're saying 'account' — do you mean the Customer or the User? Those are different things."

#### Discuss Concrete Scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

#### Cross-Reference With Code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it:

> "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

#### Update CONTEXT.md Inline

When a term is resolved, update `CONTEXT.md` right there. Don't batch these up — capture them as they happen. Use the format in [references/CONTEXT-FORMAT.md](./references/CONTEXT-FORMAT.md).

`CONTEXT.md` should be totally devoid of implementation details. Do not treat `CONTEXT.md` as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing else.

#### Offer ADRs Sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in [references/ADR-FORMAT.md](./references/ADR-FORMAT.md).

---

## Usage Examples

### Stress-Test a New Feature
```
/grillme "I want to add a refund flow to the Order service"
```
> "Before we go further — your glossary defines 'Order' as a completed purchase. A refund implies the Order is no longer complete. Is 'refund' a state on Order, or a new concept entirely?"

### Clarify Ambiguous Terms
```
/grillme "We need to handle 'account' deletions"
```
> "You said 'account' — your CONTEXT.md has both Customer and User. Which one are we deleting, and what happens to their Orders?"

### Validate Against Existing Decisions
```
/grillme "I'm switching the write model from Postgres to DynamoDB"
```
> "ADR-0002 says we chose Postgres for the write model because of ACID requirements. Have those requirements changed, or is this a new trade-off?"

### Onboard to a Domain
```
/grillme "Explain how Billing relates to Ordering"
```
> "Ordering emits OrderPlaced events. Billing consumes them to create Invoices. But your CONTEXT.md says Invoice is a request for payment — who decides when payment is actually processed?"

---

## Relationship to Other Skills

| Skill | Use When |
|-------|----------|
| **oracle-grillme** | Questioning domain assumptions, sharpening terminology, updating docs inline |
| **spec-brainstorm** | Structured discovery + architecture → design.md (use grillme before this to solidify language) |

**Key distinction:** `oracle-grillme` = "What do we mean by these words?" (domain interrogation).
