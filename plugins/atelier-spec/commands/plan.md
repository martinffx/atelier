# Generate Implementation Plan: $ARGUMENTS

Format: `<feature>` or `<feature> <change>`

## Step 1: Validate Prerequisites

@atelier-clerk determine mode and check prerequisites.

Parse arguments:
- If 1 argument → Mode: INITIAL (plan new feature)
- If 2 arguments → Mode: CHANGE (plan change to existing feature)

Check Beads installation:
```bash
bd --version
```
- If command fails → ERROR: "Beads not found. Install with: npm install -g @beads/bd, then run: bd init"

**Mode: INITIAL**
Check if spec has requirements AND design:
- If `docs/spec/$FEATURE/spec.md` doesn't exist → ERROR: "Feature not found. Create with: /spec:create $FEATURE"
- Read spec.md and verify both Requirements AND Technical Design sections exist
- If either missing → ERROR: "Run /spec:design $FEATURE first to generate technical design"
- If `docs/spec/$FEATURE/changes/initial/` already exists → ERROR: "Plan already exists. Use /spec:work to implement."

**Mode: CHANGE**
Check if proposal has requirements AND design:
- If `docs/spec/$FEATURE/changes/$CHANGE/proposal.md` doesn't exist → ERROR: "Change not found. Create with: /spec:propose $FEATURE $CHANGE"
- If `docs/spec/$FEATURE/changes/$CHANGE/design.md` doesn't exist → ERROR: "Run /spec:design $FEATURE $CHANGE first"
- If `docs/spec/$FEATURE/changes/$CHANGE/plan.json` already exists → ERROR: "Plan already exists. Approve to create Beads or use /spec:work to implement."

## Step 2: Load Design and Requirements

@atelier-clerk load design and requirements files.

**Mode: INITIAL**

Read `docs/spec/$FEATURE/spec.md`

Create change directory:
```bash
mkdir -p docs/spec/$FEATURE/changes/initial
```

**Mode: CHANGE**

Read multiple sources:
- `docs/spec/$FEATURE/spec.md` → current design (baseline)
- `docs/spec/$FEATURE/changes/$CHANGE/design.md` → proposed changes
- `docs/spec/$FEATURE/changes/$CHANGE/proposal.md` → motivation

## Step 2b: Analyze Design for Implementation Tasks

@atelier-architect analyze design to identify implementation tasks.

**Mode: INITIAL**

From loaded spec.md:
- Extract Technical Design section
- Identify all components: entities, services, repositories, routes, events, clients
- Extract Requirements section for motivation
- Set motivation: "Initial implementation of $FEATURE"

**Mode: CHANGE**

From loaded files:
- Identify delta between current design and proposed changes
- Which layers need modification (Entity, Repository, Service, Router)
- New components vs modified components
- Database migrations needed

## Step 3: Generate Implementation Plan

@atelier-architect create dependency-ordered task list.

Analyze components and create plan.json with task structure:

```json
{
  "feature": "$FEATURE",
  "change": "$CHANGE or initial",
  "motivation": "...",
  "tasks": [
    {
      "id": "task-1",
      "name": "Implement Entity: <EntityName>",
      "layer": "entity",
      "dependencies": [],
      "description": "Create entity with fromRequest, toRecord, toResponse, validate methods"
    },
    {
      "id": "task-2",
      "name": "Implement Repository: <RepositoryName>",
      "layer": "repository",
      "dependencies": ["task-1"],
      "description": "Create repository with CRUD operations"
    },
    {
      "id": "task-3",
      "name": "Implement Service: <ServiceName>",
      "layer": "service",
      "dependencies": ["task-2"],
      "description": "Create service with business logic"
    },
    {
      "id": "task-4",
      "name": "Implement Router: <RoutePath>",
      "layer": "router",
      "dependencies": ["task-3"],
      "description": "Create API endpoints"
    }
  ]
}
```

**Dependency Rules:**
- Entity has no dependencies (bottom layer)
- Repository depends on Entity
- Service depends on Repository (and Entity)
- Router depends on Service
- Follow bottom-up order: Entity → Repository → Service → Router

**Mode: INITIAL**
- Create tasks for ALL components in Technical Design
- All components are ADDED

**Mode: CHANGE**
- Create tasks for ONLY affected layers from delta
- Tasks include both ADDED and MODIFIED components

Write plan.json to:
- Mode INITIAL: `docs/spec/$FEATURE/changes/initial/plan.json`
- Mode CHANGE: `docs/spec/$FEATURE/changes/$CHANGE/plan.json`

## Step 4: Generate Delta Document

@atelier-architect create ADDED/MODIFIED/REMOVED delta.

**Mode: INITIAL**

All components are ADDED (nothing exists yet):

Generate delta.md:
```markdown
## ADDED

### New Components
- Entity: <EntityName>
- Repository: <RepositoryName>
- Service: <ServiceName>
- Router: <RoutePath>

### New Database Schema
<schema from design>

### New API Endpoints
<endpoints from design>
```

No MODIFIED or REMOVED sections.

**Mode: CHANGE**

Compare current spec.md vs proposed design.md:

Generate delta.md:
```markdown
## ADDED
<New components, methods, endpoints, fields>

## MODIFIED
<Changed components with before/after>

## REMOVED
<Deprecated components>
```

Write delta.md to:
- Mode INITIAL: `docs/spec/$FEATURE/changes/initial/delta.md`
- Mode CHANGE: `docs/spec/$FEATURE/changes/$CHANGE/delta.md`

## Step 5: Validation Checkpoint

@atelier-oracle review and validate the plan before proceeding.

Present plan summary to user:

```
Implementation Plan Summary
===========================

Feature: $FEATURE
Change: $CHANGE (or "initial")
Motivation: {{motivation}}

Tasks ({{task_count}}):
{{#each tasks}}
  {{@index}}. [{{layer}}] {{name}}
     Dependencies: {{#if dependencies}}{{dependencies}}{{else}}None{{/if}}
{{/each}}

Delta Summary:
- ADDED: {{added_count}} components
- MODIFIED: {{modified_count}} components
- REMOVED: {{removed_count}} components

Files created:
- {{plan_json_path}}
- {{delta_md_path}}
```

Display full delta.md content for review.

**Validation Questions:**

1. **Completeness:** Do the tasks cover all components in the design?
2. **Dependencies:** Are dependencies correct (bottom-up)?
3. **Delta Accuracy:** Does the delta match the design?
4. **Breaking Changes:** Are breaking changes acceptable?

Present validation results and request approval:

```
Validation Results:
✓ All design components have implementation tasks
✓ Dependencies follow bottom-up order (Entity → Repository → Service → Router)
✓ Delta matches proposed design
{{#if has_breaking_changes}}
⚠️ Warning: Breaking changes detected:
  - {{breaking_change_1}}
  - {{breaking_change_2}}
{{/if}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
APPROVAL REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Review the plan and delta above.

Options:
1. APPROVE - Create Beads epic and tasks (proceed to Step 6)
2. EDIT - Modify plan.json or delta.md manually, then re-run this command
3. CANCEL - Abort planning process

Enter your choice:
```

[Wait for user input]

If user chooses EDIT:
- Inform user to edit the files
- EXIT with message: "Re-run /spec:plan $ARGUMENTS after editing"

If user chooses CANCEL:
- Delete plan.json and delta.md
- EXIT with message: "Planning cancelled"

If user chooses APPROVE:
- Proceed to Step 6

## Step 6: Create Beads Epic

<skill-prompt>
Load: beads, spec:architect
</skill-prompt>

@atelier-architect create Beads epic with tasks after approval.

Create epic:
```bash
bd create "{{#if is_initial}}Feature{{else}}Change{{/if}}: $FEATURE{{#unless is_initial}} - $CHANGE{{/unless}}" -t epic -p 1 -l {{#if is_initial}}feature,$FEATURE{{else}}$FEATURE,change{{/if}}
```

Extract epic-id from output.

Create tasks from plan.json:
```bash
# For each task in plan.json
bd create "{{task.name}}" -t task -p 2 -l {{task.layer}},$FEATURE -e {{epic-id}}

# Add dependencies
{{#if task.dependencies}}
bd dep add {{task-id}} {{dependency-task-id}} --type blocks
{{/if}}
```

Store mapping: plan.json task-id → Beads task-id.

## Plan Complete

```
Implementation Plan Approved
============================

Created: docs/spec/$FEATURE/changes/{{change_name}}/
  - plan.json ({{task_count}} tasks)
  - delta.md ({{added}}A / {{modified}}M / {{removed}}R)

Beads Epic: {{epic-id}}
Tasks created: {{task_count}}
  - {{entity_count}} Entity tasks
  - {{repository_count}} Repository tasks
  - {{service_count}} Service tasks
  - {{router_count}} Router tasks

Next Steps:
1. Begin implementation: /spec:work $FEATURE
2. Check progress: /spec:status $FEATURE
3. When complete: /spec:complete $FEATURE {{change_name}}
```
