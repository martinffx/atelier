# CLAUDE.md

This file provides guidance to AI agents when working with code in this repository.

## Repository Overview

This is Atelier - a personal development toolkit with 24 skills for spec-driven development, code quality, deep thinking, and ecosystem patterns.

## Skills Structure

Skills are located in the `skills/` directory. Each skill is a self-contained module with:

```
skills/atelier-{domain}-{topic}/
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

## Available Skills

**Spec-Driven Development** (6 skills)
- `atelier-spec-architect` - Technical design patterns and architectural guidance
- `atelier-spec-beads` - Dependency-aware task tracking integrated with spec workflows
- `atelier-spec-methodology` - Spec-driven development methodology and workflow patterns
- `atelier-spec-product` - Product-level documentation and business context patterns
- `atelier-spec-project-structure` - Project layout and organization patterns
- `atelier-spec-testing` - Stub-driven TDD and layer boundary testing

**Deep Thinking** (2 skills)
- `atelier-oracle-challenge` - Critical thinking and challenging approaches
- `atelier-oracle-thinkdeep` - Extended sequential reasoning for complex problems

**TypeScript Patterns** (8 skills)
- `atelier-typescript-api-design` - REST API design patterns
- `atelier-typescript-build-tools` - Bun, Vitest, Biome, Turborepo
- `atelier-typescript-drizzle-orm` - Type-safe SQL for PostgreSQL/MySQL/SQLite/D1
- `atelier-typescript-dynamodb-toolbox` - Single-table design, GSI patterns
- `atelier-typescript-effect-ts` - Functional effects, error handling
- `atelier-typescript-fastify` - Fastify + TypeBox route handlers
- `atelier-typescript-functional-patterns` - ADTs, branded types, Option/Result
- `atelier-typescript-testing` - Mocking, MSW, snapshot testing

**Python Patterns** (8 skills)
- `atelier-python-architecture` - Functional core/imperative shell, DDD
- `atelier-python-build-tools` - uv, mise, ruff, basedpyright
- `atelier-python-fastapi` - Pydantic validation, dependency injection
- `atelier-python-modern-python` - Type hints, generics, async/await
- `atelier-python-monorepo` - uv workspaces, mise task orchestration
- `atelier-python-sqlalchemy` - ORM patterns, queries, async
- `atelier-python-temporal` - Workflow orchestration, activities
- `atelier-python-testing` - Stub-Driven TDD, layer boundary testing

## Installation

```bash
# Install all skills
npx skills add martinffx/atelier

# Install specific skill
npx skills add martinffx/atelier --skill atelier-typescript-drizzle-orm
```

## Development

For local development with Claude Code:

```bash
claude --plugin-dir ./atelier
```

Restart Claude Code after making changes to reload skills.
