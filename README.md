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
npx skills add martinffx/atelier --skill atelier-typescript-drizzle-orm
npx skills add martinffx/atelier --skill atelier-python-fastapi
npx skills add martinffx/atelier --skill atelier-spec-beads
```

### Available Skills

**Spec-Driven Development**
- `atelier-spec-architect` - Technical design patterns and architectural guidance
- `atelier-spec-beads` - Dependency-aware task tracking integrated with spec workflows
- `atelier-spec-methodology` - Spec-driven development methodology and workflow patterns
- `atelier-spec-product` - Product-level documentation and business context patterns
- `atelier-spec-project-structure` - Project layout and organization patterns
- `atelier-spec-testing` - Stub-driven TDD and layer boundary testing

**Deep Thinking**
- `atelier-oracle-challenge` - Critical thinking and challenging approaches
- `atelier-oracle-thinkdeep` - Extended sequential reasoning for complex problems

**TypeScript Patterns**
- `atelier-typescript-api-design` - REST API resource naming, HTTP methods, error responses, pagination
- `atelier-typescript-drizzle-orm` - Type-safe SQL for PostgreSQL/MySQL/SQLite/Cloudflare D1
- `atelier-typescript-dynamodb-toolbox` - Single-table design, entity definitions, GSI patterns
- `atelier-typescript-fastify` - Fastify + TypeBox route handlers and validation
- `atelier-typescript-functional-patterns` - ADTs, branded types, Option/Result, migration guide
- `atelier-typescript-effect-ts` - Functional effects, error handling, resources, schema, services
- `atelier-typescript-build-tools` - Bun, Vitest, Biome, Turborepo configurations
- `atelier-typescript-testing` - Mocking, MSW, snapshot testing

**Python Patterns**
- `atelier-python-architecture` - Functional core/imperative shell, DDD patterns, layered architecture
- `atelier-python-fastapi` - Pydantic validation, dependency injection, OpenAPI
- `atelier-python-sqlalchemy` - ORM patterns, queries, async, upserts
- `atelier-python-temporal` - Workflow orchestration, activities, error handling
- `atelier-python-modern-python` - Type hints, generics, async/await, pattern matching
- `atelier-python-monorepo` - uv workspaces, mise task orchestration, apps/packages
- `atelier-python-testing` - Stub-Driven TDD, layer boundary testing, pytest patterns
- `atelier-python-build-tools` - uv, mise, ruff, basedpyright, pytest configurations

Skills are auto-invoked based on their description when you work with relevant technologies. No commands needed - just install and AI agents will use them when appropriate.

## Development

For local development, use the `--plugin-dir` flag to load skills directly:

```bash
claude --plugin-dir ./atelier
```

Restart Claude Code after making changes to reload skills.

## License

MIT Copyright (c) 2026 Martin Richards
