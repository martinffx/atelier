# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## Repository Overview

This is Atelier - a personal development toolkit with 34 skills for spec-driven development, deep thinking, code quality, and ecosystem patterns.

## Skills Structure

Skills are located in the `skills/` directory. Each skill is a self-contained module with:

```
skills/{category}-{name}/
├── SKILL.md           # Main skill definition
└── references/        # Optional additional context
    ├── topic-a.md
    └── topic-b.md
```

### Skill File Format

Skills use YAML frontmatter for metadata:

```yaml
---
name: skill-name
description: When to use this skill (AI reads this to auto-load)
user-invocable: false  # or true if user can call directly
---
```

Skills are auto-invoked based on description match to current context.

## Namespace Philosophy

Skills are organized into three namespaces based on their role:

### spec: - Workflow Skills

Sequential, state-transforming steps that produce artifacts.

- **Process-oriented**: Each skill is a step in a workflow
- **User-invoked**: Called explicitly by user or previous skill
- **Artifact-producing**: Each produces a concrete output
- **Disciplined**: Must be followed exactly, not adapted

### oracle: - Thinking Skills

Analytical, knowledge-providing skills that inform decisions.

- **Knowledge-oriented**: Provide patterns, principles, guidance
- **Context-driven**: Auto-invoked when relevant context detected
- **Adaptable**: Principles adapted to specific situation
- **Supportive**: Inform workflow decisions, don't produce artifacts

### code: - Utility Skills

Tools and helpers for specific tasks.

- **Task-oriented**: Solve specific problems
- **User-invoked**: Called when needed
- **Standalone**: Can be used independently or within workflow

### Namespace Semantics

| Namespace | Type | Invocation | Output | Flexibility |
|-----------|------|------------|--------|-------------|
| spec: | Process | User/previous skill | Artifact | Follow exactly |
| oracle: | Knowledge | Context-driven | Guidance | Adapt to context |
| code: | Utility | User | Result | Use as needed |

## Skill Workflow

```mermaid
graph TB
    subgraph "spec-orchestrator"
        O[Route to skill]
    end
    
    O --> R
    
    subgraph "spec-research"
        R1[Discovery] --> R2[Research]
        R2 --> R3[Design]
        R3 -.->|invokes| A1[oracle-architect]
        R3 --> R4[spec.md]
    end
    
    R4 --> P
    
    subgraph "spec-plan"
        P1[Draft] --> P2[Annotate]
        P2 --> P3[plan.json]
    end
    
    P3 --> I
    
    subgraph "spec-implement"
        I1[TDD] -.->|invokes| T1[oracle-testing]
        I1 --> I2[Track]
        I2 --> I3[Report]
    end
    
    I3 --> F
    
    subgraph "spec-finish"
        F1[Validate] --> F2[Review]
        F2 --> F3[PR Ready]
    end
    
    P -.->|design flaw| R
    I -.->|missing tasks| P
    I -.->|fundamental issue| R
    F -.->|bugs found| I
```

### Hard Transitions

| After completing... | The ONLY next step is... |
|---------------------|--------------------------|
| spec-research | spec-plan |
| spec-plan | spec-implement |
| spec-implement | spec-finish |

Do NOT jump from requirements to code. Do NOT jump from research to implementation.

### Iteration Patterns

The workflow is not purely linear. Expect backflows:

- **Plan → Research**: Planning reveals design assumptions are wrong
- **Implement → Plan**: Implementation reveals missing tasks
- **Implement → Research**: Implementation reveals fundamental design issue
- **Finish → Implement**: Validation finds bugs

If you loop 2+ times on the same issue, stop and ask the human:

> "We've looped on [issue] twice. Should we reconsider the approach?"

### Skill Types

**Process skills** (spec-research, spec-plan, spec-implement, spec-finish): Follow exactly.
Don't adapt away discipline.

**Knowledge skills** (oracle-architect, oracle-testing): Adapt principles to
context. These inform decisions within the workflow.

Process skills come first. Knowledge skills get invoked by process skills when needed.

## Available Skills

**Spec-Driven Development** (5 skills)
- `spec-finish` - Post-implementation validation
- `spec-implement` - Execute tasks from plan.json
- `spec-plan` - Implementation plan + tasks → plan.json
- `spec-research` - Discovery + research + architecture → spec.md
- `spec-orchestrator` - Skill routing and workflow orchestration

**Deep Thinking** (7 skills)
- `oracle-architect` - DDD patterns, component responsibilities
- `oracle-challenge` - Critical thinking and challenging approaches
- `oracle-doubt` - Adversarial review of non-trivial decisions with fresh-context scrutiny
- `oracle-grillme` - Socratic interrogation of plans against domain model and documented decisions
- `oracle-security` - Security architecture and threat modeling
- `oracle-testing` - TDD patterns, boundary testing
- `oracle-thinkdeep` - Extended sequential reasoning for complex problems

**TypeScript Patterns** (8 skills)
- `typescript-api-design` - REST API design patterns
- `typescript-build-tools` - Bun, Vitest, Biome, Turborepo
- `typescript-drizzle-orm` - Type-safe SQL for PostgreSQL/MySQL/SQLite/D1
- `typescript-dynamodb-toolbox` - Single-table design, GSI patterns
- `typescript-effect-ts` - Functional effects, error handling
- `typescript-fastify` - Fastify + TypeBox route handlers
- `typescript-functional-patterns` - ADTs, branded types, Option/Result
- `typescript-testing` - Mocking, MSW, snapshot testing

**Python Patterns** (8 skills)
- `python-architecture` - Functional core/imperative shell, DDD
- `python-build-tools` - uv, mise, ruff, basedpyright
- `python-fastapi` - Pydantic validation, dependency injection
- `python-modern-python` - Type hints, generics, async/await
- `python-monorepo` - uv workspaces, mise task orchestration
- `python-sqlalchemy` - ORM patterns, queries, async
- `python-temporal` - Workflow orchestration, activities
- `python-testing` - Stub-Driven TDD, layer boundary testing

**Code Utilities** (6 skills)
- `code-commit` - Generate and validate conventional commits
- `code-debug` - Systematic debugging workflow and techniques
- `code-docs` - Documentation generation for code projects
- `code-handoff` - Compact conversation into handoff document for next agent
- `code-review` - Multi-agent code review with parallel reviewers
- `code-subagents` - Subagent dispatch patterns for implementation tasks

## Installation

```bash
# Install all skills
npx skills add martinffx/atelier

# Install specific skill
npx skills add martinffx/atelier --skill typescript-drizzle-orm
```

## Development

For local development with Claude Code:

```bash
claude --plugin-dir ./atelier
```

Restart Claude Code after making changes to reload skills.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:970c3bf2 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   bd dolt push
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->

<!-- BEGIN BEADS CODEX SETUP: generated by bd setup codex -->
## Beads Issue Tracker

Use Beads (`bd`) for durable task tracking in repositories that include it. Use the `beads` skill at `.agents/skills/beads/SKILL.md` (project install) or `~/.agents/skills/beads/SKILL.md` (global install) for Beads workflow guidance, then use the `bd` CLI for issue operations.

### Quick Reference

```bash
bd ready                # Find available work
bd show <id>            # View issue details
bd update <id> --claim  # Claim work
bd close <id>           # Complete work
bd prime                # Refresh Beads context
```

### Rules

- Use `bd` for all task tracking; do not create markdown TODO lists.
- Run `bd prime` when Beads context is missing or stale. Codex 0.129.0+ can load Beads context automatically through native hooks; use `/hooks` to inspect or toggle them.
- Keep persistent project memory in Beads via `bd remember`; do not create ad hoc memory files.

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.
<!-- END BEADS CODEX SETUP -->
