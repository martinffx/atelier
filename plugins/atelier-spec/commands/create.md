# Initialize Feature Spec: $ARGUMENTS

## Step 1: Check Project Initialization

@atelier-clerk verify project has been initialized for SDD.

Check if product document exists:
```bash
test -f docs/product/product.md
```

If `docs/product/product.md` does NOT exist:
- ERROR: "Project not initialized for Spec-Driven Development."
- Instruct user: "Run `/spec:init` first to set up the project structure."
- EXIT

## Step 2: Validate Prerequisites

@atelier-clerk check for existing spec and Beads installation.

Check if spec already exists:
- If `docs/spec/$ARGUMENTS/spec.md` exists → ERROR: "Spec already exists. Use /spec:propose for changes."

Check Beads installation:
```bash
bd --version
```
- If command fails → ERROR: "Beads not found. Install with: npm install -g @beads/bd, then run: bd init"

## Step 3: Detect Existing Code

@atelier-clerk search for existing code using multiple strategies.

Search for code in these patterns (stop at first match):

1. **Feature-named directory:**
   - `src/$ARGUMENTS/`
   - `lib/$ARGUMENTS/`
   - `app/$ARGUMENTS/`
   - `packages/$ARGUMENTS/`

2. **Layer-based with feature subdirectory:**
   - `src/{routes,services,repositories,entities}/$ARGUMENTS.*`
   - `src/{routers,handlers}/$ARGUMENTS.*`

3. **Layer-based with feature in filename:**
   - `src/routes/$ARGUMENTS.{ts,py,rs,js}`
   - `src/services/$ARGUMENTS*Service.{ts,py,rs,js}`
   - `src/repositories/$ARGUMENTS*Repository.{ts,py,rs,js}`

If code found:
- Set mode: BROWNFIELD
- Pass discovered file paths to next step

If no code found:
- Set mode: GREENFIELD
- Skip Step 3b

## Step 3b: Analyze Existing Code (BROWNFIELD only)

@atelier-architect analyze discovered code structure.

Analyze code structure from discovered files:
- **Entities:** class/interface definitions, properties, methods (fromRequest, toRecord, toResponse, validate)
- **Services:** class definitions, public methods, dependencies
- **Repositories:** CRUD operations, query methods, database interactions
- **Routes/Controllers:** endpoints (method, path), request/response types
- Extract: methods, types, endpoints, database interactions

Document findings for requirements discovery.

## Step 4: Requirements Discovery

@atelier-oracle conduct structured discovery interview to gather user stories, acceptance criteria, and scope boundaries.

### If GREENFIELD (no existing code):

**User Story Format:** As a [user type], I want to [action] so that [benefit]

Your user story for $ARGUMENTS:
[Wait for response]

**Acceptance Criteria (3-5 specific, testable conditions):**

Your criteria:
[Wait for response]

**Business Rules (constraints, validation rules):**

Your rules:
[Wait for response]

**Scope:**
- What's included in this feature?
- What's explicitly excluded?

[Wait for response]

### If BROWNFIELD (code exists):

Show discovered code structure to user.

**Current State Assessment:**

Reviewing the discovered code, let's assess its current state:

**What works correctly?** (preserve these)
[Wait for response]

**What's broken or buggy?** (fix these - behavior doesn't match expectations)
[Wait for response]

**What's missing entirely?** (add these - features not yet implemented)
[Wait for response]

**What should change?** (improve these - works but needs enhancement)
[Wait for response]

**Requirements Documentation:**

Now let's document the target state:

**User Story:** What should this feature do when complete?
[Wait for response]

**Acceptance Criteria:** What are the success conditions? (3-5 testable criteria)
[Wait for response]

**Business Rules:** What constraints and validation rules apply?
[Wait for response]

## Step 5: Write Requirements to Spec

@atelier-clerk generate requirements document.

Create directory structure:
```bash
mkdir -p docs/spec/$ARGUMENTS
```

Write requirements to spec.md:
- Create `docs/spec/$ARGUMENTS/spec.md`
- Include only the Requirements section:
  - User Story
  - Acceptance Criteria
  - Business Rules
  - Scope (Included/Excluded)
- Leave Technical Design section empty (to be filled by /spec:design)
- Leave Implementation Notes section empty

**For GREENFIELD mode:**
- Write requirements from interview responses
- Add note: "Mode: Greenfield (new implementation)"

**For BROWNFIELD mode:**
- Write target state requirements (what should exist when complete)
- Document current state in Requirements section as context
- Add note: "Mode: Brownfield (existing code detected)"
- List discovered code files for reference

## Requirements Complete

Created: `docs/spec/$ARGUMENTS/spec.md` (requirements only)

The specification includes:
- {{mode}} development mode ({{#if code_found}}existing code documented{{else}}new feature{{/if}})
- User story and acceptance criteria
- Business rules and scope boundaries
- {{#if code_found}}Current state assessment{{/if}}

**Next step:**

Generate technical design: `/spec:design $ARGUMENTS`
