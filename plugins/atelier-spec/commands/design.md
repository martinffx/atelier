# Generate Technical Design: $ARGUMENTS

Format: `<feature>` or `<feature> <change>`

## Step 1: Validate Prerequisites

@clerk determine mode and check prerequisites.

Parse arguments:
- If 1 argument → Mode: INITIAL (design new feature)
- If 2 arguments → Mode: CHANGE (design change to existing feature)

**Mode: INITIAL**
Check if spec exists with requirements:
- If `docs/spec/$FEATURE/spec.md` doesn't exist → ERROR: "Feature not found. Create with: /spec:create $FEATURE"
- Read spec.md and verify Requirements section exists
- If Technical Design section already exists → ERROR: "Design already exists. Use /spec:design $FEATURE <change> for changes."

**Mode: CHANGE**
Check if proposal exists:
- If `docs/spec/$FEATURE/changes/$CHANGE/proposal.md` doesn't exist → ERROR: "Change proposal not found. Create with: /spec:propose $FEATURE $CHANGE"
- If `docs/spec/$FEATURE/changes/$CHANGE/design.md` already exists → ERROR: "Change design already exists. Use /spec:plan to continue."

## Step 2: Load Product Context

@clerk load product context.

Read files:
- `docs/product/product.md` for vision and goals
- Existing `docs/spec/*/spec.md` for patterns and conventions

## Step 2b: Load Technical Standards

@clerk load technical standards.

Read files:
- `docs/standards/tech.md` for architecture patterns
- `docs/standards/coding.md` for implementation conventions

## Step 3: Load Requirements

@clerk load requirements based on mode.

**Mode: INITIAL**
Read `docs/spec/$FEATURE/spec.md`

**Mode: CHANGE**
Read multiple sources:
- `docs/spec/$FEATURE/spec.md` → current design (baseline)
- `docs/spec/$FEATURE/changes/$CHANGE/proposal.md` → change requirements

## Step 3b: Analyze Loaded Context

@architect extract patterns and requirements from loaded context.

From product context:
- Product vision alignment
- Existing related features and patterns

From technical standards:
- Layered architecture patterns
- Technology stack conventions

From requirements:
- User story, acceptance criteria, business rules, scope
- Brownfield mode indicator (if present)
- For CHANGE mode: what needs to change, why, affected components

## Step 4: Generate Technical Design

<skill-prompt>
Load: spec:architect
</skill-prompt>

@architect create technical design following project standards.

**Mode: INITIAL - Design Entire Feature**

Apply architectural patterns from spec:architect skill based on requirements and loaded context.

**Mode: CHANGE - Design Modifications**

Analyze current design from spec.md and determine:

**What needs modification:**
- New fields/methods to add to existing entities
- New operations to add to existing services
- New endpoints to add to existing routes
- Schema changes (new tables, columns, indexes)
- New events or event payload changes

**Impact analysis:**
- Which layers are affected (Entity, Service, Repository, Router)
- Breaking changes (API contracts, database schema, event payloads)
- Migration requirements

**Design the delta:**
- Show modified entity signatures
- Show new/modified service methods
- Show new/modified API endpoints
- Show database migrations (ALTER TABLE, etc.)

## Step 5: Write Design Output

@clerk write design to appropriate location.

**Mode: INITIAL**

Update `docs/spec/$FEATURE/spec.md`:
- Append Technical Design section with:
  - Architecture Pattern
  - Domain Model (entities with methods)
  - Services (interfaces and operations)
  - Data Persistence (repository interfaces, database schema)
  - API Endpoints (table format)
  - Events (if applicable)
- Keep Implementation Notes section empty

**Mode: CHANGE**

Create `docs/spec/$FEATURE/changes/$CHANGE/design.md`:
- Write standalone design document for the change:
  - Current State (baseline from spec.md)
  - Proposed Changes (modifications to each layer)
  - Migration Strategy (data, schema, code changes)
  - Breaking Changes (if any)

Update `docs/spec/$FEATURE/changes/$CHANGE/proposal.md`:
- Append Technical Design section referencing design.md
- Include summary of affected components

**Do NOT modify main spec.md in CHANGE mode** - changes are merged later via /spec:complete.

## Design Complete

**Mode: INITIAL**
```
Updated: docs/spec/$FEATURE/spec.md

The specification now includes:
- Requirements (user story, acceptance criteria, business rules)
- Technical Design (architecture, domain model, services, APIs, data persistence)
- {{component_count}} components identified
- {{layer_count}} layers needed

Next step: /spec:plan $FEATURE
```

**Mode: CHANGE**
```
Created: docs/spec/$FEATURE/changes/$CHANGE/design.md
Updated: docs/spec/$FEATURE/changes/$CHANGE/proposal.md

The change design includes:
- Current state baseline
- Proposed modifications to {{affected_layer_count}} layers
- Migration strategy
- {{#if has_breaking_changes}}⚠️ Breaking changes identified{{/if}}

Next step: /spec:plan $FEATURE $CHANGE
```
