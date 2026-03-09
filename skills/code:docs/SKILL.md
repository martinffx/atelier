---
name: code:docs
description: >
  Documentation generation for code projects. Use when updating docs, writing README, generating
  API docs, creating changelog, or when the user mentions documentation, docs, readme, api docs,
  or any documentation task.
user-invocable: true
---

# Code Docs

Documentation generation and maintenance for code projects.

## When to Document

**Always update docs when:**
- Adding new features
- Changing existing behavior
- Updating configuration
- Breaking changes

**Docs should live:**
- Near the code (docstrings, comments)
- In the repo (README, docs folder)
- Generated (API docs, type docs)

---

## Doc Types

### README

Project overview, setup, usage. See references/readme-structure.md

**Template:**
```markdown
# Project Name

Brief description (one line).

## Quick Start

3-5 commands to get running.

## Installation

Detailed setup steps.

## Usage

Code examples.

## API

Link to full API docs.

## Contributing

How to contribute.

## License
```

### API Documentation

See references/api-docs.md for:
- TypeDoc (JavaScript/TypeScript)
- Sphinx (Python)
- godoc (Go)
- JSDoc (JavaScript)

### Changelog

See references/changelog.md for Keep a Changelog format.

**Sections:**
- Added
- Changed
- Deprecated
- Removed
- Fixed
- Security

### Architecture Docs

See references/architecture-docs.md for:
- ADRs (Architecture Decision Records)
- Diagrams
- System overviews

---

## Generation Commands

### TypeScript/JavaScript

```bash
# TypeDoc
npx typedoc --out docs src/index.ts

# JSDoc
npx jsdoc src/ -d docs/

# API Extractor (monorepos)
npx api-extractor run
```

### Python

```bash
# Sphinx
sphinx-build -b html docs docs/_build

# pdoc
pdoc --output-dir docs src/

# mkdocs
mkdocs serve
```

### Go

```bash
# godoc
godoc -http=:6060

# swag (OpenAPI from comments)
swag init -g cmd/server/main.go
```

---

## Workflow

### 1. Identify what needs docs

- New files/features → update relevant doc
- Breaking change → update CHANGELOG
- New public API → update API docs

### 2. Generate/Update

- Run doc generators
- Update manual docs
- Verify examples work

### 3. Verify

- Links work
- Examples run
- Build passes

### 4. Commit

```
docs: update API documentation

Generated via typedoc.
Added: new /users endpoint
Changed: authentication section
```

---

## Best Practices

1. **Write docs in the code** - Docstrings, comments
2. **Generate where possible** - Don't duplicate
3. **Keep README minimal** - Link to detailed docs
4. **Version with code** - Docs in same repo/PR
5. **Test examples** - Ensure they run
