---
name: project-structure
description: Directory layout implementing AgentOS 3-layer context. Use when setting up projects, organizing docs, or explaining where specs and changes go.
user-invocable: false
---

# Project Structure

Directory layout implementing the AgentOS 3-layer context model.

## 3-Layer Directory Structure

```
project/
├── docs/
│   ├── standards/        # Layer 1: How you build
│   ├── product/          # Layer 2: What and why
│   └── spec/             # Layer 3: What to build next
├── .beads/               # Beads task tracking
└── CLAUDE.md             # Project overview
```

**AgentOS 3-Layer Model:**
- **Layer 1 (standards/)**: Technical patterns, coding principles, architecture decisions
- **Layer 2 (product/)**: Product vision, roadmap, business context
- **Layer 3 (spec/)**: Feature specs and change proposals

## Layer 1: Standards (docs/standards/)

Technical standards adapted for the project's technology stack:

- **coding.md** - TDD patterns (Stub → Test → Implement → Refactor), coding principles
- **architecture.md** - Layered architecture (Router → Service → Repository → Entity → Database)

## Layer 2: Product (docs/product/)

Product-level documentation:

- **product.md** - Product definition, target users, core features, success metrics
- **roadmap.md** - Next 3 features in priority order, implementation strategy, current status

## Layer 3: Specs (docs/spec/)

### Greenfield Features (New Code)

```
docs/spec/<feature>/
└── spec.md          # Unified requirements + technical design
```

**spec.md** contains:
- Requirements (user stories, acceptance criteria, business rules)
- Technical Design (data models, API design, component structure)

### Brownfield Changes (Existing Code)

```
docs/changes/<feature>/<change>/
├── proposal.md      # Change proposal
├── delta.md         # ADDED/MODIFIED/REMOVED changes
└── tasks.md         # Implementation tasks
```

**Workflow:**
1. `/spec:propose` creates proposal.md and delta.md
2. `/spec:work` executes implementation
3. `/spec:complete` merges delta into spec.md, deletes change folder

## Beads Task Tracking

```
.beads/
├── beads.jsonl      # Git-tracked task data
├── beads.db         # Local cache (gitignored)
└── bd.sock          # Socket (gitignored)
```

**.gitignore entries:**
```
.beads/beads.db
.beads/bd.sock
```

Beads provides dependency-aware task management. Commands like `/spec:create` and `/spec:propose` automatically create epics with tasks ordered by technical dependencies (Entity → Repository → Service → Router).
