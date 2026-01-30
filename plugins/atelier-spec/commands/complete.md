# Complete Change: $ARGUMENTS

Format: `<feature_name> <change_name>`

## Step 1: Validate Prerequisites

@clerk check for change proposal and Beads epic.

Check if change exists:
- If `docs/spec/$FEATURE/changes/$CHANGE/` doesn't exist → ERROR: "Change proposal not found. Create with: /spec:propose $FEATURE $CHANGE"

Check Beads epic:
```bash
bd list --label $FEATURE,$CHANGE --json
```
- Verify all tasks are closed

## Step 2: Load Change Artifacts

@clerk read design, delta, and current spec.

Read files:
- `docs/spec/$FEATURE/changes/$CHANGE/design.md` → technical design changes
- `docs/spec/$FEATURE/changes/$CHANGE/delta.md` → ADDED/MODIFIED/REMOVED summary
- `docs/spec/$FEATURE/changes/$CHANGE/proposal.md` → motivation
- `docs/spec/$FEATURE/spec.md` → current specification

## Step 2b: Parse Delta and Prepare Merge

@architect parse delta and prepare merge strategy.

Parse delta:
- ADDED: New components, methods, fields
- MODIFIED: Changed components, methods, rules
- REMOVED: Deprecated items

Prepare merge strategy:
- Identify sections of spec.md to update
- Determine ordering of changes
- Flag any conflicts with existing spec

## Step 3: Merge Changes into Spec

@architect merge design and delta into main spec.md.

Update `docs/spec/$FEATURE/spec.md`:

### Requirements Section
- Update business rules if MODIFIED in delta
- Add new acceptance criteria if applicable
- Update scope if changed

### Technical Design Section

Merge changes from design.md according to delta:

**For ADDED components:**
- Add new entity definitions to Domain Model
- Add new service methods to Services section
- Add new repository methods to Data Persistence section
- Add new API endpoints to API Endpoints table
- Add new database schema to Database Schema section

**For MODIFIED components:**
- Update entity signatures with new fields/methods
- Update service method signatures
- Update API endpoint specifications
- Add ALTER TABLE statements to schema

**For REMOVED components:**
- Mark as deprecated with migration notes
- Keep for historical reference

### Implementation Notes Section
- Add entry documenting the change:
  ```markdown
  ### Change: $CHANGE ({{date}})
  **Motivation**: {{from proposal.md}}
  **Changes**: {{summary from delta.md}}
  **Layers Affected**: {{affected_layers}}
  **Beads Epic**: {{epic-id}}
  ```

## Step 4: Close Beads Epic

@clerk close the Beads epic.

Mark epic as complete:
```bash
bd close <epic-id> --reason "Change $CHANGE merged into spec"
```

## Step 5: Archive Change Files

@clerk archive change files to maintain history.
```bash
git add docs/spec/$FEATURE/changes/$CHANGE/
git add docs/spec/$FEATURE/spec.md
```

Note: Git preserves history, so change folder can be deleted after commit:
```bash
rm -rf docs/spec/$FEATURE/changes/$CHANGE/
```

Or keep for reference (optional).

## Change Complete

Merged change into: `docs/spec/$FEATURE/spec.md`

The specification now includes:
- Updated technical design (merged from design.md)
- Updated components (according to delta.md)
- Implementation notes documenting the change
- Closed Beads epic

Archived change artifacts:
- `docs/spec/$FEATURE/changes/$CHANGE/` (preserved in git history)

**Next steps:**

1. Review updated spec: `docs/spec/$FEATURE/spec.md`
2. Commit changes: `/code:commit`
3. Start next change: `/spec:propose $FEATURE <new_change>`
4. Or start new feature: `/spec:create <new_feature>`
