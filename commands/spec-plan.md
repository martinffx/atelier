# Spec Plan: $ARGUMENTS

Purpose: Create implementation plan → produces plan.json

## Prerequisites

- `docs/spec/{feature}/spec.md` exists and is approved by human

## Steps

### Step 1: Load Spec

Read `docs/spec/{feature}/spec.md`

Extract:
- Requirements section
- Technical Design section
- Any specific implementation notes

### Step 2: Generate Tasks

@architect create dependency-ordered task list based on the Technical Design

Order tasks from bottom to top:
1. Entity tasks (no dependencies)
2. Repository tasks (depend on Entity)
3. Service tasks (depend on Repository)
4. Router tasks (depend on Service)

For each task include:
- Task ID and name
- Layer (entity/repository/service/router)
- Description
- Dependencies (other task IDs)

### Step 3: Create Plan

@clerk create docs/spec/{feature}/plan.json

Write plan.json structure:
```json
{
  "feature": "{feature}",
  "tasks": [
    {
      "id": "entity-1",
      "name": "Implement Entity: {name}",
      "layer": "entity",
      "dependencies": [],
      "description": "..."
    }
  ]
}
```

### Step 4: Review

Present plan.json to human for approval.

**Say:** "Plan is complete with {N} tasks. Ready for your review before we start implementation."

## Output

- Created/Updated: `docs/spec/{feature}/plan.json`

## Next Step

After human approval: `/spec:implement {feature}`
