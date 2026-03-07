# Plan Template

Use this template when creating implementation plans.

## Full Plan Template

```markdown
# [Feature Name] Implementation Plan

**Goal:** [One sentence]

**Context:** [What we know]

**Constraints:** [Limitations]

**Success Criteria:** [How we know we're done]

---

## Task Breakdown

### Task 1: [Name]
**Domain Boundary:** [Entity|Repository|Service|Router|Database]
**Description:** [What]
**Dependencies:** [None|Previous task]
**Verification:** [How to verify]
**Commit:** feat: [message]

### Task 2: [Name]
**Domain Boundary:** [Entity|Repository|Service|Router|Database]
**Description:** [What]
**Dependencies:** Task 1
**Verification:** [How to verify]
**Commit:** feat: [message]

[... more tasks]

---

## Implementation Order

1. [Domain] Task 1 name
2. [Domain] Task 2 name

**Rationale:** Explain why this order (dependencies, domain boundaries)
```

## Quick Task Template

```
### Task N: [Name]
- **Boundary:** [Domain]
- **What:** [Brief]
- **Verify:** [Command/Check]
- **Commit:** feat: [message]
```

## Domain Boundary Mapping

| Layer | Test Type | What to Stub |
|-------|-----------|--------------|
| Entity | Unit | Nothing |
| Service | Unit | Repositories |
| Router | Integration | Service |
| Repository | Integration | DB |
