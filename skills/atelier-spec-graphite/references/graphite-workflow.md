# Graphite Workflow for Spec-Driven Development

## Complete Workflow Example

### Scenario: Implement User Authentication

Following spec-driven development with Entity → Repository → Service → Router layers.

### Step 1: Initialize Worktree

```bash
# From main, create worktree
git worktree add .worktrees/auth -b feature/auth
cd .worktrees/auth
npm install
npm test  # Verify clean baseline
```

### Step 2: Create Entity Layer PR

```bash
# Create first branch in stack (off main)
gt create "entity-user" -m "Implement UserEntity with validation"

# Implement UserEntity
# - fromRequest() - Parse request to entity
# - validate() - Business rule validation  
# - toRecord() - Convert to DB record
# - toResponse() - Convert to API response

git add -A
git commit -m "Implement UserEntity with validation"

# Verify tests pass
npm test

# Submit if ready (or continue working)
# gt submit  # Wait until all layers done
```

### Step 3: Create Repository Layer PR

```bash
# Create stacked branch (auto-stacks on current)
gt create "repo-user" -m "Implement UserRepository with CRUD"

# Implement UserRepository
# - save() - Create/update user
# - findById() - Get user by ID
# - findByEmail() - Get user by email

git add -A
git commit -m "Implement UserRepository CRUD"

# This PR is now stacked on Entity PR
npm test
```

### Step 4: Create Service Layer PR

```bash
# Create next layer stacked on Repository
gt create "service-user" -m "Implement AuthService with business logic"

# Implement AuthService
# - register() - User registration flow
# - login() - Authentication flow
# - validatePassword() - Password validation

git add -A
git commit -m "Implement AuthService"

# Stacked on Repository PR
npm test
```

### Step 5: Create Router Layer PR

```bash
# Final layer stacked on Service
gt create "router-auth" -m "Implement auth routes"

# Implement Router
# - POST /auth/register
# - POST /auth/login

git add -A
git commit -m "Implement auth routes"

# Top of stack
npm test
```

### Step 6: View Stack

```bash
gt log
```

Output:
```
◉ router-auth              Implement auth routes
├─◉ service-user           Implement AuthService with business logic
  └─◉ repo-user            Implement UserRepository with CRUD
    └─◉ entity-user        Implement UserEntity with validation
```

### Step 7: Submit Stack

```bash
# Submit all 4 PRs at once
gt submit
```

GitHub creates:
- PR #1: Entity (base, no dependencies)
- PR #2: Repository (depends on #1)
- PR #3: Service (depends on #2)
- PR #4: Router (depends on #3)

### Step 8: Handle Review Feedback

**Suppose PR #1 (Entity) needs changes:**

```bash
# Make changes to entity
vim src/entity/user.ts
git add -A

# Use gt modify (NOT git commit --amend!)
gt modify --amend

# Graphite automatically:
# 1. Amends the commit
# 2. Rebases repo-user on new commit
# 3. Rebases service-user on new repo-user
# 4. Rebases router-auth on new service-user
# 5. Updates all 4 PRs

# Verify still works
npm test
```

### Step 9: Sync with Trunk

**Suppose main has new commits:**

```bash
# Sync entire stack
gt sync

# Graphite automatically:
# 1. Fetches latest main
# 2. Rebases entire stack onto new main
# 3. Updates all PRs
```

## Verification Commands

```bash
# Check current branch position
gt log

# List all PRs in stack
gt stack --all

# Check sync status
gt sync --dry-run

# Validate stack integrity
gt branch validate
```

## Troubleshooting

### Branch not in stack

```bash
# Add to stack manually
gt branch create feature/name --parent parent-branch
```

### Stack is broken

```bash
# Rebuild stack from trunk
gt sync --rebuild
```

### Too many branches

```bash
# Squash old branches
gt branch squash old-branch --into new-branch
```

## Integration Points

### With Beads

```bash
# When Entity task done
gt create "entity-user" -m "Implement UserEntity"

# When Repository task done  
gt create "repo-user" -m "Implement UserRepository"
# ... etc
```

### With /spec:complete

The `/spec:complete` command should call Graphite:
1. Run tests locally
2. `gt submit` to create/update all PRs
3. Present completion options

### With Worktree

```bash
# Before starting Graphite workflow
atelier-spec-worktree creates .worktrees/feature

# After completing Graphite workflow
atelier-spec-complete-branch handles cleanup
```
