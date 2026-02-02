# Propose Change: $ARGUMENTS

Format: `<feature_name> <change_name>`

## Step 1: Validate Prerequisites

@atelier-clerk check for existing spec.

Check if spec exists:
- If `docs/spec/$FEATURE/spec.md` doesn't exist → ERROR: "Feature spec not found. Create with: /spec:create $FEATURE"

## Step 2: Load Current State

@atelier-clerk retrieve current feature specification.

Read files:
- `docs/spec/$FEATURE/spec.md` → current requirements and design
- `docs/standards/` → architectural patterns

## Step 2b: Analyze Current Architecture

@atelier-architect extract current architectural state.

Extract current state from loaded files:
- Existing entities, services, repositories, routes
- Current business rules and constraints
- API endpoints and data models

Summarize current implementation for change scope discussion.

## Step 3: Discovery Interview for Change Scope

@atelier-oracle conduct lightweight discovery interview to define change scope and requirements.

Show current feature implementation context.

**Change Questions:**

**What needs to change?**
[Wait for response]

**Why is this change needed?** (motivation)
[Wait for response]

**What components are affected?**
[Wait for response]

**Are there breaking changes?**
[Wait for response]

**What's the implementation approach?**
[Wait for response]

## Step 4: Write Structured Requirements

@atelier-clerk generate requirements.json and proposal.md.

Create directory:
```bash
mkdir -p docs/spec/$FEATURE/changes/$CHANGE
```

### Generate requirements.json

Create `docs/spec/$FEATURE/changes/$CHANGE/requirements.json`:

```json
{
  "feature": "$FEATURE",
  "change": "$CHANGE",
  "date": "{{current_date}}",
  "motivation": {
    "problem": "{{what_needs_to_change}}",
    "why_now": "{{why_is_this_needed}}"
  },
  "affected_components": [
    "{{component_1}}",
    "{{component_2}}"
  ],
  "breaking_changes": "{{yes/no and details}}",
  "implementation_approach": "{{approach_description}}"
}
```

### Generate proposal.md

Create `docs/spec/$FEATURE/changes/$CHANGE/proposal.md` from template:
- Apply template from `${CLAUDE_PLUGIN_ROOT}/assets/templates/proposal.md`
- Populate from requirements.json:
  - Motivation section (problem, why now)
  - Affected Components (preliminary list)
  - Breaking Changes (if any)
  - Implementation Approach (high-level)
- Leave Technical Design section empty (to be filled by /spec:design)
- Set Status: "Draft"

## Change Requirements Complete

Created: `docs/spec/$FEATURE/changes/$CHANGE/`
  - requirements.json (structured requirements)
  - proposal.md (human-readable, Status: Draft)

The change proposal includes:
- Motivation (what needs to change and why)
- Affected components (preliminary)
- Breaking changes assessment
- Implementation approach (high-level)

**Next step:**

Generate technical design: `/spec:design $FEATURE $CHANGE`
