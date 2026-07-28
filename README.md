# Atelier

![Atelier - A collaborative workshop for software development](atelier.jpg)

> A personal development toolkit for AI agents. It covers spec-driven development, code quality, and deep thinking.

Atelier gives coding agents a disciplined way to move from an idea to reviewed, verified code without taking control away from the developer.

```bash
npx skills add martinffx/atelier
npx @martinffx/atelier@latest init --harness <claude|opencode|codex|cursor>
```

## How Atelier works

Atelier uses as much process as each request needs. Bounded work gets a concise plan in the conversation. Substantial work gets a durable spec, an implementation plan, and tracked execution. The developer approves the plan before implementation begins.

```mermaid
flowchart TD
    R[Request] --> O[spec-orchestrator]
    O -->|Bounded work| IP[spec-plan: Inline Plan]
    IP --> A[Developer approval]
    A --> I[Implement directly]
    I --> V[Validate]
    O -->|Substantial work| B[spec-brainstorm]
    B --> D[design.md]
    D --> G[oracle-grill-me]
    G --> P[spec-plan: review and approve]
    P --> J[plan.json]
    J --> SI[spec-implement]
    SI --> CR[code-review]
    CR --> F[spec-finish]
    F --> PR[code-pull-request]
```

The workflow is deliberately harder to rush than an unstructured agent session. It records decisions when they need to survive the conversation, keeps implementation tied to an approved plan, and requires evidence before calling the work complete.

## Grill the idea

[`oracle-grill-me`](skills/oracle-grill-me/SKILL.md) interviews you one question at a time until the important decisions are explicit. It researches facts from the codebase instead of asking you to supply them, gives a recommended answer for each decision, and leaves the final choice with you.

As the discussion resolves, it maintains the project's domain language and architectural decisions. Use it on a proposal, plan, migration, or design that feels settled a little too quickly.

```text
Grill me on this migration plan
```

## Review the code

[`code-review`](skills/code-review/SKILL.md) runs a multi-agent review rather than asking one agent for a general opinion. Sentinel triages the diff, specialist reviewers examine likely failure modes in parallel, Architect checks design boundaries, and a final challenge pass removes weak or unsupported findings.

```text
rq             # Review the diff to main
rq develop     # Review against another branch
rs             # Work through the findings
```

It reports findings before changing code. You decide which fixes to apply.

## What you get

Atelier installs a focused set of skills for the full development loop:

| Area | Capabilities |
|------|--------------|
| Spec workflow | Discovery, research, planning, implementation, validation, and finishing |
| Thinking | Root-cause debugging, decision grilling, and domain modelling |
| Delivery | Multi-agent review, subagent coordination, commits, handoffs, and pull requests |

The CLI also configures three specialist agents for Claude Code, OpenCode, Codex, or Cursor:

| Agent | Role |
|-------|------|
| **Sentinel** | Fast codebase reconnaissance and review triage |
| **Oracle** | Requirements, trade-offs, and adversarial analysis |
| **Architect** | Domain modelling, system design, and architecture review |

Run `npx @martinffx/atelier@latest --help` for CLI commands and options. Each skill contains its own operating instructions and loads when its context applies.

## Ecosystem

Language-specific guidance is being split into companion repositories:

- `martinffx/python-skills`
- `martinffx/typescript-skills`

## Rationale and inspiration

Better models alone do not produce better software. Coding agents, like human teams, are shaped by the systems they work within. Good outcomes depend on more than individual ability. They depend on the processes, constraints, shared context, and feedback surrounding the work. If that system does little to encourage quality or catch weak results, agents will simply produce unreliable code faster. Atelier is an attempt to build a better system around the agent, making robust output more repeatable. [Building Your Own Agent Harness](https://www.martinrichards.me/post/building_your_own_agent_harness/) explains the thinking behind it.

The name is literal. An atelier is a workshop where a principal works with assistants. Here, the developer is the principal, agents are the assistants, the codebase is the workshop, and skills record how the work happens.

Atelier draws on spec-driven development and several projects that informed its approach to agent collaboration:

- [Agent OS](https://github.com/buildermethods/agent-os) for discovering project standards and shaping lightweight specs.
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) for fluid, artifact-guided workflows that support iteration and brownfield development.
- [GitHub Spec Kit](https://github.com/github/spec-kit) for making specifications central to a structured specify, plan, tasks, and implement workflow.
- [Superpowers](https://github.com/obra/superpowers) for composable skills, mandatory engineering workflows, TDD, and evidence-based verification.
- [Matt Pocock's Skills](https://github.com/mattpocock/skills) for small, adaptable skills grounded in practical engineering and developer control.

Some Atelier skills have more direct lineage:

| Atelier skill | Source skill | Relationship |
|---------------|--------------|--------------|
| [`spec-orchestrator`](skills/spec-orchestrator/SKILL.md) | Superpowers [`using-superpowers`](https://github.com/obra/superpowers/tree/main/skills/using-superpowers) | Adapted from its mandatory skill-routing discipline. |
| [`spec-brainstorm`](skills/spec-brainstorm/SKILL.md) | Superpowers [`brainstorming`](https://github.com/obra/superpowers/tree/main/skills/brainstorming) | Adapted from its conversational discovery and section-by-section design approval. |
| [`spec-plan`](skills/spec-plan/SKILL.md) | Superpowers [`writing-plans`](https://github.com/obra/superpowers/tree/main/skills/writing-plans) | Inspired by its explicit, verifiable implementation plans. |
| [`spec-implement`](skills/spec-implement/SKILL.md) | Superpowers [`executing-plans`](https://github.com/obra/superpowers/tree/main/skills/executing-plans) and [`test-driven-development`](https://github.com/obra/superpowers/tree/main/skills/test-driven-development) | Inspired by plan-driven execution and test-first feedback loops. |
| [`spec-finish`](skills/spec-finish/SKILL.md) | Superpowers [`finishing-a-development-branch`](https://github.com/obra/superpowers/tree/main/skills/finishing-a-development-branch) and [`verification-before-completion`](https://github.com/obra/superpowers/tree/main/skills/verification-before-completion) | Inspired by its validation and completion workflow. |
| [`code-subagents`](skills/code-subagents/SKILL.md) | Superpowers [`subagent-driven-development`](https://github.com/obra/superpowers/tree/main/skills/subagent-driven-development) and [`dispatching-parallel-agents`](https://github.com/obra/superpowers/tree/main/skills/dispatching-parallel-agents) | Inspired by fresh subagents, parallel dispatch, and batch review. |
| [`code-handoff`](skills/code-handoff/SKILL.md) | Matt Pocock's [`handoff`](https://github.com/mattpocock/skills/tree/main/skills/productivity/handoff) | Adapted from its context-preserving handoff format. |
| [`oracle-grill-me`](skills/oracle-grill-me/SKILL.md) | Matt Pocock's [`grilling`](https://github.com/mattpocock/skills/tree/main/skills/productivity/grilling) and [`grill-with-docs`](https://github.com/mattpocock/skills/tree/main/skills/engineering/grill-with-docs) | Adapted from its rigorous interview loop and integration with living domain documentation. |
| [`oracle-domain-modelling`](skills/oracle-domain-modelling/SKILL.md) | Matt Pocock's [`domain-modeling`](https://github.com/mattpocock/skills/tree/main/skills/engineering/domain-modeling) | Adapted from its active domain-modelling discipline, `CONTEXT.md`, and lightweight ADRs. |
| [`oracle-debug`](skills/oracle-debug/SKILL.md) | Superpowers [`systematic-debugging`](https://github.com/obra/superpowers/tree/main/skills/systematic-debugging) and Matt Pocock's [`diagnosing-bugs`](https://github.com/mattpocock/skills/tree/main/skills/engineering/diagnosing-bugs) | Adapted from their root-cause-first debugging workflows. |

[`code-commit`](skills/code-commit/SKILL.md) follows the [Conventional Commits](https://www.conventionalcommits.org/) specification.

Atelier adapts these ideas into an opinionated toolkit that works across harnesses. It does not claim to have invented the practices it uses.

## Development

Load the repository directly in Claude Code:

```bash
claude --plugin-dir ./atelier
```

Build and test the CLI:

```bash
bun run build
bun test
bun run typecheck
```

Restart your coding harness after changing skills so it reloads their definitions.

## License

MIT Copyright (c) 2026 Martin Richards
