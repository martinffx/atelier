# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## Repository Overview

This is Atelier - a personal development toolkit with 24 skills for spec-driven development, deep thinking, code quality, and ecosystem patterns.

## Skills Structure

Skills are located in the `skills/` directory. Each skill is a self-contained module with:

```
skills/{category}:{name}/
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

**Spec-Driven Development** (5 skills)
- `spec:finish` - Post-implementation validation
- `spec:implement` - Execute tasks from plan.json
- `spec:plan` - Implementation plan + tasks → plan.json
- `spec:research` - Discovery + research + architecture → spec.md
- `spec:workflow` - Skill routing and discipline

**Deep Thinking** (4 skills)
- `oracle:architect` - DDD patterns, component responsibilities
- `oracle:challenge` - Critical thinking and challenging approaches
- `oracle:testing` - TDD patterns, boundary testing
- `oracle:thinkdeep` - Extended sequential reasoning for complex problems

**TypeScript Patterns** (8 skills)
- `typescript:api-design` - REST API design patterns
- `typescript:build-tools` - Bun, Vitest, Biome, Turborepo
- `typescript:drizzle-orm` - Type-safe SQL for PostgreSQL/MySQL/SQLite/D1
- `typescript:dynamodb-toolbox` - Single-table design, GSI patterns
- `typescript:effect-ts` - Functional effects, error handling
- `typescript:fastify` - Fastify + TypeBox route handlers
- `typescript:functional-patterns` - ADTs, branded types, Option/Result
- `typescript:testing` - Mocking, MSW, snapshot testing

**Python Patterns** (8 skills)
- `python:architecture` - Functional core/imperative shell, DDD
- `python:build-tools` - uv, mise, ruff, basedpyright
- `python:fastapi` - Pydantic validation, dependency injection
- `python:modern-python` - Type hints, generics, async/await
- `python:monorepo` - uv workspaces, mise task orchestration
- `python:sqlalchemy` - ORM patterns, queries, async
- `python:temporal` - Workflow orchestration, activities
- `python:testing` - Stub-Driven TDD, layer boundary testing

## Installation

```bash
# Install all skills
npx skills add martinffx/atelier

# Install specific skill
npx skills add martinffx/atelier --skill typescript:drizzle-orm
```

## Development

For local development with Claude Code:

```bash
claude --plugin-dir ./atelier
```

Restart Claude Code after making changes to reload skills.
