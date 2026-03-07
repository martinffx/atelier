---
name: atelier-spec-research
description: Discovery and design for new features. Use when starting a new feature, conducting discovery interviews, or creating technical design. Outputs a PRD.
user-invocable: true
---

# Research Skill

Discovery and design for new features. Conduct discovery interviews, define scope, and create technical design.

## Overview

Research transforms an idea into a PRD through structured discovery and technical architecture.

## Part 1: Discovery

### Discovery Checklist

Use this 6-item checklist to validate your understanding before proceeding to design:

- [ ] **Problem Validated** - Confirmed the problem exists, matters, and affects enough users to justify work
- [ ] **Users Identified** - Know who experiences the problem, their roles, and constraints
- [ ] **Current Solution Analyzed** - Understood how users solve this problem today (manual workarounds, competitors, etc.)
- [ ] **Success Criteria Defined** - Clear, measurable outcomes that indicate the feature works
- [ ] **Scope Boundaries Set** - Explicitly defined what is IN and OUT of scope
- [ ] **Integration Points Known** - Identified systems, data, and dependencies this feature connects to

### Process Flow

```
START: Have a feature/change to make
  ↓
VALIDATE PROBLEM: Confirm it exists, matters, affects users
  ↓
IDENTIFY USERS: Know who experiences it, their roles
  ↓
ANALYZE CURRENT SOLUTION: How do they solve it today?
  ↓
DEFINE SUCCESS CRITERIA: Clear, measurable outcomes
  ↓
SET SCOPE BOUNDARIES: What's IN and OUT
  ↓
IDENTIFY INTEGRATIONS: Systems, data, dependencies
  ↓
END: Ready for technical design
```

### Scope Definition

Define clear boundaries for the feature:

**In Scope:**
- Core functionality that delivers the primary value
- Critical user journeys that must be supported
- Essential integrations required for MVP
- Minimum viable data model
- Must-have business rules

**Out of Scope:**
- Nice-to-have features deferred to later
- Advanced use cases for future iterations
- Optional integrations
- Performance optimizations beyond basic requirements
- Edge cases that can be handled manually

### User Story Extraction

Convert discovery insights into actionable user stories:

**Story Format:**
```
As a [role]
I want to [action]
So that [benefit]
```

**Acceptance Criteria:**
- Given [context]
- When [action]
- Then [expected outcome]

**Examples:**
```
As a project manager
I want to view task dependencies
So that I can identify blockers

Acceptance Criteria:
- Given tasks with dependencies
- When viewing a task
- Then I see all blocking and blocked tasks
```

### Prioritization Matrix

**Value vs Effort:**
- **High Value, Low Effort** → Do first (quick wins)
- **High Value, High Effort** → Do second (core features)
- **Low Value, Low Effort** → Do later (polish)
- **Low Value, High Effort** → Don't do (avoid waste)

**Dependencies:**
- Technical dependencies (database before API)
- Business dependencies (auth before user features)
- Learning dependencies (experiments before commitments)
- External dependencies (third-party integrations)

## Part 2: Technical Design

### Architecture Model

Unified view of functional core and effectful edge:

```
          Effectful Edge (IO)              Functional Core (Pure)
┌─────────────────────────────────┐    ┌──────────────────────────┐
│  Router    → request parsing    │    │  Service  → orchestration│
│  Consumer  → event handling     │───▶│  Entity   → domain rules │
│  Client    → external APIs      │    │            → validation  │
│  Producer  → event publishing   │◀───│            → transforms  │
│  Repository→ data persistence   │    │                          │
└─────────────────────────────────┘    └──────────────────────────┘
```

**Key Principle:** Business logic lives in the functional core (Service + Entity). IO operations live in the effectful edge. Core defines interfaces; edge implements them (dependency inversion).

### Functional Core

Pure, deterministic components containing all business logic.

**Service Layer:**
- Orchestrate business operations, coordinate between entities and repositories
- Pure functions that take data and return results
- No IO operations (database, HTTP, file system)
- Calls repositories through interfaces (dependency injection)
- Composes entity operations into workflows
- Returns success/error results

**Entity Layer:**
- Domain models, validation, business rules, data transformations
- Pure data structures with behavior
- All validation logic
- Data transformations (fromRequest, toRecord, toResponse)
- Business rules and invariants
- No IO, no framework dependencies

### Effectful Edge

IO-performing components that interact with the outside world.

**Router:**
- HTTP request handling, parsing, response formatting
- Parses HTTP requests into domain types
- Calls service layer with parsed data
- Formats service results into HTTP responses
- Handles HTTP-specific concerns (status codes, headers)
- No business logic

**Repository:**
- Data persistence and retrieval
- Implements data access interface used by services
- Converts between domain entities and database records
- Handles database queries and transactions
- No business logic or validation

### Component Matrix

| Concern | Component | Layer | Testability |
|---------|-----------|-------|-------------|
| Domain model | Entity | Core | Unit test (pure) |
| Validation | Entity | Core | Unit test (pure) |
| Business rules | Entity | Core | Unit test (pure) |
| Orchestration | Service | Core | Unit test (stub repos) |
| Data transforms | Entity | Core | Unit test (pure) |
| HTTP parsing | Router | Edge | Integration test |
| Data access | Repository | Edge | Integration test |
| External APIs | Client | Edge | Integration test |
| Event handling | Consumer | Edge | Integration test |
| Event publishing | Producer | Edge | Integration test |

### Task Breakdown

**Bottom-Up Dependency Ordering:**

Implementation order follows dependency chain:

```
1. Entity   → Domain models, validation, transforms
2. Repository → Data access interfaces and implementations
3. Service  → Business logic orchestration
4. Router   → HTTP endpoints
```

**Rationale:** Each layer depends on layers below. Can't implement service without entity, can't implement router without service.

**Bite-Sized Task Granularity:**

Target: 2-5 minute tasks for subagents.

Each task should be completable by a subagent in one go without needing to ask clarifying questions mid-flight:

- Create single file (not multiple)
- Implement one function/method (not multiple)
- Add one feature flag/config (not multiple)
- Write tests for one component (not entire feature)

**Why 2-5 minutes?**
- Subagent context stays focused
- Review cycles are shorter
- Easier to verify each piece
- Less context pollution between tasks

## Output

- `docs/prd/<feature>.md` - PRD with requirements and technical design

## References

- [DDD Patterns](references/ddd-patterns.md)
- [Data Modeling](references/data-modeling.md)
- [API Design](references/api-design.md)
