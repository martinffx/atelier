# Atelier

![Atelier - A collaborative workshop for software development](atelier.jpg)

> An atelier is the private workshop or studio where a principal master and a number of assistants, students, and apprentices can work together producing fine art or visual art released under the master's name or supervision.
>
> [Wikipedia](https://en.wikipedia.org/wiki/Atelier)

A personal development toolkit for AI agents - spec-driven development, code quality, deep thinking, and ecosystem patterns.

## Skills

This repository includes 24 skills that can be installed via [skills.sh](https://skills.sh/). Skills are modular, auto-invoked capabilities that enhance AI agents with specialized knowledge and workflows.

### Installing Skills

```bash
# Install all skills from the repository
npx skills add martinffx/atelier

# Install specific skills
npx skills add martinffx/atelier --skill typescript:drizzle-orm
npx skills add martinffx/atelier --skill python:fastapi
npx skills add martinffx/atelier --skill spec:beads
```

### Available Skills

**Spec-Driven Development**
- `spec:architect` - Technical design patterns and architectural guidance
- `spec:beads` - Dependency-aware task tracking integrated with spec workflows
- `spec:methodology` - Spec-driven development methodology and workflow patterns
- `spec:product` - Product-level documentation and business context patterns
- `spec:project-structure` - Project layout and organization patterns
- `spec:testing` - Stub-driven TDD and layer boundary testing

**Deep Thinking**
- `oracle:challenge` - Critical thinking and challenging approaches
- `oracle:thinkdeep` - Extended sequential reasoning for complex problems

**TypeScript Patterns**
- `typescript:api-design` - REST API resource naming, HTTP methods, error responses, pagination
- `typescript:drizzle-orm` - Type-safe SQL for PostgreSQL/MySQL/SQLite/Cloudflare D1
- `typescript:dynamodb-toolbox` - Single-table design, entity definitions, GSI patterns
- `typescript:fastify` - Fastify + TypeBox route handlers and validation
- `typescript:functional-patterns` - ADTs, branded types, Option/Result, migration guide
- `typescript:effect-ts` - Functional effects, error handling, resources, schema, services
- `typescript:build-tools` - Bun, Vitest, Biome, Turborepo configurations
- `typescript:testing` - Mocking, MSW, snapshot testing

**Python Patterns**
- `python:architecture` - Functional core/imperative shell, DDD patterns, layered architecture
- `python:fastapi` - Pydantic validation, dependency injection, OpenAPI
- `python:sqlalchemy` - ORM patterns, queries, async, upserts
- `python:temporal` - Workflow orchestration, activities, error handling
- `python:modern-python` - Type hints, generics, async/await, pattern matching
- `python:monorepo` - uv workspaces, mise task orchestration, apps/packages
- `python:testing` - Stub-Driven TDD, layer boundary testing, pytest patterns
- `python:build-tools` - uv, mise, ruff, basedpyright, pytest configurations

Skills are auto-invoked based on their description when you work with relevant technologies. No commands needed - just install and AI agents will use them when appropriate.

## Development

For local development, use the `--plugin-dir` flag to load skills directly:

```bash
claude --plugin-dir ./atelier
```

Restart Claude Code after making changes to reload skills.

## License

MIT Copyright (c) 2026 Martin Richards
