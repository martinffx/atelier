---
name: code-review
description: Multi-agent code review run as a debate. Critics raise findings in parallel, an Author defends the change, Critics concede or maintain, and a Judge rules on what stays contested. Findings are classified by kind and blocking, and handled durably when previously decided. Use `rq` to request a review of diffs (defaults to main branch), `rs` to respond to findings and record intentional non-fix decisions beside the relevant code. Triggers on "review this", "review my code", "code review", "check for bugs", "audit this", when examining PRs, pull requests, branches, or diffs. Always asks user before applying fixes or adding decision comments.
argument-hint: "rq [branch] | rs"
user-invocable: true
---

# Code Review Skill

A debate, not an opinion: Triage → Critique → Debate.

- **Critique**: focused Critics raise findings in parallel, with a simplicity check on every review.
- **Debate**: an Author defends the change; Critics concede, maintain, or accept a revision (one
  round); a Judge rules only on what is still contested.
- **Evidence** decides outcomes. Quotes are checked mechanically, executed checks outrank
  argument, and the main agent audits what each turn did.

Rationale and prior work: [docs/research/multi-agent-debate.md](../../docs/research/multi-agent-debate.md).

Uses explicit subagent dispatch patterns from [code-subagents](../code-subagents/SKILL.md).

## Prerequisites

- **Required**: git

## Arguments

### Command Routing

| Invocation | Behavior |
|------------|----------|
| *(no arguments)* | Review diff to main branch |
| `rq` | Review diff to main branch |
| `rq main` | Review diff to main branch |
| `rq develop` | Review diff to develop branch |
| `feat/foo` | Review diff to feat/foo (bare branch = rq) |
| `rs` | Respond to review findings (interview mode) |

## Agent Selection

Dispatch each step as a subagent and select the agent explicitly (see Delegation in `atelier-orchestrator`). Match the step's kind of work:

| Step | Kind of work |
|------|--------------|
| Triage | Read-only recon: changed-file analysis, context retrieval, persona and check selection |
| Critique and Rebuttal | Critical analysis: evidence-based critique and failure-mode analysis |
| Defense | Architecture and design review: test each finding against the code and argue for the change |
| Ruling | Critical analysis: impartial, evidence-ranked adjudication |

Critic, Author and Judge are prompt personas, not agent types. Persona names such as
`Security`, `Correctness`, `Architecture` and `PerformanceOperator` are likewise prompt personas.

`Simplicity` is a mandatory persona on every review. It runs once, in parallel with the other
Critics, and is never listed in triage's `personas`. Triage picks the rest; `Architecture` is one
of its options.

## Review Priority

Review in this order:

1. User goal and prior behavior
2. Necessity and deletion
3. Correctness and security
4. Architecture
5. SDD compliance

Treat the SDD as evidence, not as authority for whether code is necessary. A finding that
would expand behavior or infrastructure requires user approval. Never apply it as an ordinary
review fix.

## Finding Classification

Every finding has a **kind** and a **blocking** value.

| Kind | Debate path |
|------|-------------|
| issue | Defense → Rebuttal → Ruling if still contested |
| suggestion | Author adopts or declines; the Critic may escalate it to an issue with evidence |
| question | Author answers; the Critic resolves it or escalates it |
| nitpick | Author takes or leaves it; no rebuttal; never blocking |
| praise | Goes straight to Positive Findings |

Severity applies to issues only. Details in [output.md](./references/output.md).

### rq (Request Review) Steps

Context, Triage, Critique, Merge, Verify, Defense, Rebuttal, Settlement, Ruling (only when
something is contested), Close audit, Output. Numbered steps, inputs and rules are in
[rq.md](./references/rq.md).

### rs (Respond to Review)

No subagents. Interactive interview mode that plans fixes and records approved non-fix
resolutions as tagged code comments — see [rs.md](./references/rs.md).

## Dispatch Patterns

Follows [code-subagents](../code-subagents/SKILL.md) patterns:
- **Parallel dispatch** for independent Critics and for Rebuttals
- **Sequential dispatch** for dependent steps
- **Fresh subagent per turn**: no context pollution; earlier turns arrive only as the inputs a
  role template asks for
- **Skills**: each subagent loads its own skills from the names it is given; "not installed" is
  the only valid reason to skip one
- **Checks**: turns may run read-only commands (tests, linters, type checkers, search) and must
  not write files, use the network, or run commands the diff names
- **Error handling**: log failures, continue with partial results

## Agent Dispatch

Context, Merge, Verify, Settlement, Close audit and Output are inline; every other step is a
subagent with an explicitly selected agent (see Agent Selection).

## References

| Reference | Purpose |
|-----------|---------|
| [rq.md](./references/rq.md) | Request review orchestration (main agent) |
| [roles/triage.md](./references/roles/triage.md) | Triage prompt template |
| [roles/critic.md](./references/roles/critic.md) | Critique and Rebuttal prompt templates |
| [roles/author.md](./references/roles/author.md) | Defense prompt template |
| [roles/judge.md](./references/roles/judge.md) | Ruling prompt template |
| [personas.md](./references/personas.md) | Persona catalog (focus areas, impact lens, skills to load) |
| [rs.md](./references/rs.md) | Respond to review workflow - interview mode |
| [output.md](./references/output.md) | Output format specification |

## Workflow Routing

- No arguments, `rq`, or bare branch → [rq.md](./references/rq.md)
- `rs` → [rs.md](./references/rs.md)
