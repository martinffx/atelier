# Sync Spec from Code: $ARGUMENTS

## Step 1: Validate Prerequisites

@clerk verify spec exists.

Check if spec exists:
- If `docs/spec/$ARGUMENTS/spec.md` does NOT exist → ERROR: "No spec found. Use /spec:create to create a spec first."

## Step 2: Find Code Location

@clerk locate code for feature.

**Strategy 1: From spec references**
- Read `docs/spec/$ARGUMENTS/spec.md`
- Extract file paths mentioned in Implementation Notes or design
- Use those paths as starting point

**Strategy 2: Convention-based search**
Search for code in these patterns:

1. Feature-named directory:
   - `src/$ARGUMENTS/`
   - `lib/$ARGUMENTS/`
   - `app/$ARGUMENTS/`

2. Layer-based with feature:
   - `src/{routes,services,repositories,entities}/$ARGUMENTS.*`
   - `src/routes/$ARGUMENTS.{ts,py,rs,js}`
   - `src/services/$ARGUMENTS*Service.{ts,py,rs,js}`

If no code found → WARN: "No code found for $ARGUMENTS. Spec unchanged."

## Step 3: Analyze Existing Code

@architect analyze existing code structure.

Analyze existing code:
- Scan discovered source files for all components
- **Entities:** class/interface definitions, methods (fromRequest, toRecord, toResponse, validate), properties and types
- **Services:** class definitions, public methods, dependencies
- **Repositories:** CRUD operations, query methods, database interactions
- **Routes/Controllers:** endpoints (method, path), request/response types, handler logic
- **Events:** published events, subscribed events, event handlers
- **Clients:** external API calls, integration points
- Extract signatures, types, and patterns
- Document actual implementation structure

## Step 4: Parse Current Specification

@architect parse current specification.

Parse current specification:
- Read `docs/spec/$ARGUMENTS/spec.md`
- Extract expected entities, services, repositories, routes from Technical Design section
- Extract API endpoints, data models, business logic specifications
- Document intended implementation structure

## Step 5: Generate Drift Report

Compare `code_structure` with `spec_structure`:

**In code but NOT in spec (ADDED):**
- New methods not documented
- New endpoints not in API section
- New entities or entity methods
- New database fields
- New events

**In spec but NOT in code (MISSING):**
- Planned features not yet implemented
- Removed functionality

**Different from spec (MODIFIED):**
- Method signatures changed
- Endpoint paths or verbs changed
- Database schema differences

## Step 6: Update Spec with Code Reality

@clerk update spec to match actual code.

Update `docs/spec/$ARGUMENTS/spec.md`:

### Technical Design Section

**Update Domain Model:**
- Add discovered entities
- Update entity methods to match code
- Add/remove properties based on code

**Update Services:**
- Add/update service operations from code
- Match method signatures
- Document actual dependencies

**Update API Endpoints:**
- Add discovered endpoints
- Update paths, methods, request/response types
- Remove endpoints not in code

**Update Data Persistence:**
- Sync database schema with actual tables/collections
- Update indexes from code
- Match field types

**Update Events:**
- Add discovered event publications
- Add discovered event subscriptions
- Match event payload types

### Implementation Notes Section

Add sync entry:
```markdown
## Implementation Notes
- Synced from code ({{date}})
  - Discovered: {{discovered_items}}
  - Updated: {{updated_items}}
  - Removed: {{removed_items}}
```

Write updated spec back.

## Step 7: Create Beads for Incomplete Work

@clerk identify and track incomplete implementation.

Scan code for markers of incomplete work:

**NotImplementedError / todo!() / throw new Error('Not implemented'):**
```bash
grep -r "NotImplementedError\|throw new Error('Not implemented')\|todo!()" src/$ARGUMENTS/
```

**TODO comments:**
```bash
grep -r "TODO\|FIXME\|XXX" src/$ARGUMENTS/
```

**Unhandled edge cases:**
- Missing error handling
- Missing validation
- Incomplete test coverage

For each discovered issue:
```bash
bd create "Fix: <description>" -t task -p 2 -l $ARGUMENTS,technical-debt
```

## Sync Complete

Updated: `docs/spec/$ARGUMENTS/spec.md`

Sync results:
- Discovered {{new_count}} new elements
- Updated {{changed_count}} existing elements
- Removed {{removed_count}} outdated elements
- Created {{beads_count}} Beads for incomplete work

The spec now reflects actual code state.

**Next steps:**

1. Review synced spec: `docs/spec/$ARGUMENTS/spec.md`
2. Address incomplete work: `/spec:work $ARGUMENTS`
3. Propose new changes: `/spec:propose $ARGUMENTS <change>`
4. Check status: `/spec:status $ARGUMENTS`
