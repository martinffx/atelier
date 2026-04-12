# Output Format

## Structured Summary

```markdown
# Code Review: {module/files}

## Summary
{2-3 sentence overview of changes and overall quality}

## Statistics
- Files reviewed: N
- Findings: N Critical, N High, N Medium, N Low
- Pre-existing: N | Introduced: N

## Critical (Fix before merge)

### {Finding Title}

- **Location**: `file:line`
- **Severity**: Critical
- **Pre-existing**: No
- **Issue**: {What's wrong}
- **Impact**: {Why this matters}
- **Reasoning**:
  <details>
  <summary>Extended reasoning</summary>
  {Detailed explanation of why this was flagged}
  </details>
- **Suggestion**: {How to fix}

## High Priority

### {Finding Title}
{Same structure}

## Medium Priority
{Same structure}

## Low Priority
{Same structure}

## Positive Findings

- {What the code does well}
- {Smart patterns to keep}
- {Good practices observed}
```

---

## Inline Finding Format

For each finding, provide inline comment style:

```
[{file}:{line}] {Finding Title}
Severity: {Critical/High/Medium/Low}
Pre-existing: {Yes/No}
Issue: {Brief description}
Reasoning: {Why this matters}
Suggestion: {Fix}
```

---

## Severity Definitions

| Severity | When to use | Examples |
|----------|------------|----------|
| Critical | Security vulnerability, data loss risk, crash possible | SQL injection, auth bypass, unhandled exception that crashes |
| High | Bug causing wrong behavior, significant performance issue | Logic error, N+1 at scale, broken error handling |
| Medium | Code smell, maintainability issue, minor bug | Missing validation, excess complexity, unclear naming |
| Low | Style preference, optional improvement, educational | Naming inconsistency, missing docs, minor refactor |

---

## Pre-existing vs Introduced

| Type | Definition | How to detect |
|------|------------|---------------|
| Pre-existing | Bug existed before this PR | Git blame shows code unchanged |
| Introduced | Bug introduced by this PR | Code added/modified in diff |

**Marking pre-existing:**
- Check if the line was modified in the current diff
- If unchanged but flagged, mark as pre-existing
- Pre-existing findings are informational, not blocking

---

## Extended Reasoning

Each finding includes a collapsible section with:

1. **Why flagged**: What triggered the finding (pattern, heuristic, context)
2. **Verification**: How it was validated (static analysis, pattern match, context)
3. **Evidence**: Code snippets, references, or examples
4. **Alternative view**: If uncertain, what else to consider

Example:
```markdown
<details>
<summary>Extended reasoning</summary>

**Why flagged**: The `query` parameter is directly interpolated into SQL string without parameterization.

**Verification**: Pattern match detected: `f"SELECT * FROM {table}"` - Python f-string in SQL context.

**Evidence**: 
```python
query = f"SELECT * FROM users WHERE id = {user_id}"  # Line 42
```

**Alternative view**: If using a query builder or ORM, check if it handles escaping internally.
</details>
```

---

## Example Output

```markdown
# Code Review: src/auth/login.ts

## Summary
Implements OAuth login flow with token refresh. Generally well-structured with proper error handling. One security concern around token storage and a performance issue with token validation on every request.

## Statistics
- Files reviewed: 1
- Findings: 1 Critical, 1 High, 0 Medium, 2 Low
- Pre-existing: 1 | Introduced: 3

## Critical (Fix before merge)

### Token stored in localStorage

- **Location**: `src/auth/login.ts:45`
- **Severity**: Critical
- **Pre-existing**: No
- **Issue**: Access token stored in localStorage, vulnerable to XSS
- **Impact**: Any XSS vulnerability exposes user tokens
- **Reasoning**:
  <details>
  <summary>Extended reasoning</summary>
  
  **Why flagged**: localStorage is accessible to any JavaScript on the page.
  
  **Verification**: Direct localStorage API usage detected.
  
  **Evidence**:
  ```typescript
  localStorage.setItem('accessToken', token); // Line 45
  ```
  
  **Alternative view**: If using httpOnly cookies is not possible, consider short-lived tokens with refresh rotation.
  </details>
- **Suggestion**: Use httpOnly cookies or secure session storage

## High Priority

### Token validation on every request

- **Location**: `src/auth/middleware.ts:12`
- **Severity**: High
- **Pre-existing**: Yes
- **Issue**: Token validated against auth server on every request
- **Impact**: Adds 50-200ms latency per request

## Low Priority

### Missing JSDoc on public function

- **Location**: `src/auth/login.ts:23`
- **Severity**: Low
- **Pre-existing**: No
- **Issue**: `validateToken` lacks documentation

### Inconsistent naming: userId vs user_id

- **Location**: `src/auth/login.ts:67`
- **Severity**: Low
- **Pre-existing**: Yes
- **Issue**: Mixed snake_case and camelCase in same file

## Positive Findings

- Clean separation of OAuth flow into dedicated functions
- Proper error handling with typed error classes
- Token refresh logic handles edge cases well
```

---

## Implementation Notes

1. **Skills to load** are determined by Triage based on detected language/framework
2. **Pre-existing detection** requires git blame check (not just diff)
3. **Extended reasoning** should be collapsible in markdown renderers
4. **Positive findings** help balance the review tone
