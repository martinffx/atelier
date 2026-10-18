# Output Format

## Structured Summary

```markdown
# Code Review: {module/files}

## Summary
{2-3 sentence overview of changes and overall quality}

## Statistics
- Files reviewed: N
- Findings: N blocking, N non-blocking (N issue, N suggestion, N nitpick)
- Issues by severity: N Critical, N High, N Medium, N Low
- Pre-existing: N | Introduced: N
- Debated: N (upheld N, modified N, withdrawn N)
- Honored decisions: N

## Unnecessary scope

- {Unrequested behavior or infrastructure, or `None`}

## Deletion candidates

- {Files, symbols, wrappers, or tests that can be removed, or `None`}

## Smallest viable alternative

{The smallest implementation that preserves the user goal and prior behavior, or `None`}

## Required SDD corrections

- {Changes needed so the SDD records the smaller result, or `None`}

## Blocking (fix before merge)

### issue (blocking, Critical): {Finding Title}

- **Location**: `file:line`
- **Kind**: issue
- **Blocking**: Yes
- **Severity**: Critical
- **Pre-existing**: No
- **Issue**: {What's wrong}
- **Impact**: {Why this matters}
- **Debate**: {Author confirmed | Author disputed → Critic maintained → Judge upheld | …}
- **Reasoning**:
  <details>
  <summary>Extended reasoning</summary>
  {Detailed explanation, including the exchange}
  </details>
- **Suggestion**: {How to fix}
- **Requires user approval**: {Yes when the suggestion expands behavior or infrastructure; otherwise No}
- **Mechanical**: {Yes when the fix keeps behavior identical, stays local, and needs no judgment; otherwise No}
- **Prior decision reopened**: {Why the recorded rationale no longer applies; omit when not applicable}

## Non-blocking

Issues ordered by severity, then suggestions, then nitpicks.

### issue (High): {Finding Title}
{Same structure}

### suggestion: {Finding Title}
{Same structure; no severity}

### nitpick: {Finding Title}
{Location, Issue, Suggestion only}

## Follow-ups

- {Valid findings outside this change: kind, location, one line}

## Answered questions

- `{file:line}` {Question} → {Answer}

## Withdrawn in debate

- `{id}` {Title} — {reason} (settled by {Critic concession | Judge})

## Positive Findings

- {What the code does well}
- {Smart patterns to keep}
- {Good practices observed}

## Honored Decisions

- `{comment-file}:{line}` — {Concern}: {Short rationale and why it still applies}

## Audit

<details>
<summary>Debate audit</summary>

- Working tree: {unchanged | changed — all `test` evidence voided}
- Turns: {per turn: commands run, re-runs matched / total, violations}
- Evidence voided: {what and why, or none}
- Unresolved: {contested items shown with both positions, or none}
</details>
```

Omit **Follow-ups**, **Answered questions**, **Withdrawn in debate**, **Honored Decisions** and
the nitpick group when they have no items. Keep **Audit** short: one line per turn.

Honored decisions are a compact bullet each; do not repeat the full finding. Severity and
pre-existing/introduced counts cover active findings only. Always render the four simplicity
sections, using `None` when no evidence supports an item.

`praise` findings appear only under Positive Findings.

---

## Inline Finding Format

For each finding, provide inline comment style, prefixed with its kind so it pastes into a
PR comment:

```
[{file}:{line}] {kind} ({blocking|non-blocking}, {severity}): {Finding Title}
Pre-existing: {Yes/No}
Issue: {Brief description}
Reasoning: {Why this matters}
Suggestion: {Fix}
Debate: {outcome}
Requires user approval: {Yes/No}
Mechanical: {Yes/No}
Prior decision reopened: {Why the recorded rationale no longer applies; omit when not applicable}
```

Omit severity for anything that is not an issue.

---

## Kinds

| Kind | Meaning | Blocking? |
|------|---------|-----------|
| issue | Something is wrong or risky | Yes or no |
| suggestion | A better approach; the code works as written | Yes or no |
| question | The reviewer cannot tell; states what answer would make it an issue | Never until escalated |
| nitpick | Style or convention, backed by a documented rule | Never |
| praise | Worth keeping | Never |

`follow_up` marks a valid finding that is outside this change; it is listed under Follow-ups and
not fixed here.

---

## Severity Definitions (issues only)

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
- Pre-existing findings are informational and non-blocking

---

## Extended Reasoning

Each finding includes a collapsible section with:

1. **Why flagged**: What triggered the finding (pattern, heuristic, context)
2. **Verification**: How it was validated (executed check, verified quote, static analysis)
3. **Evidence**: Code snippets, check output, or references
4. **Debate**: The Author's response, the Critic's rebuttal, and the Judge's ruling, when any
5. **Alternative view**: If uncertain, what else to consider

When a recorded decision is reopened, also identify the comment location and the evidence that
invalidated its rationale or met its reconsideration condition.

Example:
```markdown
<details>
<summary>Extended reasoning</summary>

**Why flagged**: The `query` parameter is directly interpolated into SQL string without parameterization.

**Verification**: Verified quote at `src/db.py:42`; no parameter binding on the path (checked with `grep -n "execute(" src/db.py`).

**Evidence**:
```python
query = f"SELECT * FROM users WHERE id = {user_id}"  # Line 42
```

**Debate**: Author disputed (claimed upstream validation); Critic maintained — validation at
`src/api.py:18` runs only on the legacy route. Judge upheld.

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
- Findings: 1 blocking, 3 non-blocking (2 issue, 0 suggestion, 1 nitpick)
- Issues by severity: 1 Critical, 1 High, 0 Medium, 0 Low
- Pre-existing: 1 | Introduced: 3
- Debated: 2 (upheld 1, modified 0, withdrawn 1)
- Honored decisions: 0

## Unnecessary scope

- None

## Deletion candidates

- None

## Smallest viable alternative

None

## Required SDD corrections

- None

## Blocking (fix before merge)

### issue (blocking, Critical): Token stored in localStorage

- **Location**: `src/auth/login.ts:45`
- **Kind**: issue
- **Blocking**: Yes
- **Severity**: Critical
- **Pre-existing**: No
- **Issue**: Access token stored in localStorage, vulnerable to XSS
- **Impact**: Any XSS vulnerability exposes user tokens
- **Debate**: Author disputed → Critic maintained → Judge upheld
- **Reasoning**:
  <details>
  <summary>Extended reasoning</summary>

  **Why flagged**: localStorage is accessible to any JavaScript on the page.

  **Verification**: Verified quote at `src/auth/login.ts:45`.

  **Evidence**:
  ```typescript
  localStorage.setItem('accessToken', token); // Line 45
  ```

  **Debate**: Author argued the CSP blocks inline scripts; Critic showed `script-src 'unsafe-inline'`
  at `src/server.ts:9`. Judge upheld.

  **Alternative view**: If using httpOnly cookies is not possible, consider short-lived tokens with refresh rotation.
  </details>
- **Suggestion**: Use httpOnly cookies or secure session storage
- **Requires user approval**: No
- **Mechanical**: No

## Non-blocking

### issue (High): Token validation on every request

- **Location**: `src/auth/middleware.ts:12`
- **Severity**: High
- **Pre-existing**: Yes
- **Issue**: Token validated against auth server on every request
- **Impact**: Adds 50-200ms latency per request
- **Debate**: Author confirmed

### nitpick: Missing JSDoc on public function

- **Location**: `src/auth/login.ts:23`
- **Issue**: `validateToken` lacks documentation (repo rule: `docs/conventions.md` requires JSDoc on exports)

## Answered questions

- `src/auth/login.ts:60` Why a 15-minute expiry? → `docs/auth.md:12` fixes it to match the refresh window.

## Withdrawn in debate

- `f4` Inconsistent naming: userId vs user_id — Critic conceded: `.eslintrc` allows both.

## Positive Findings

- Clean separation of OAuth flow into dedicated functions
- Proper error handling with typed error classes
- Token refresh logic handles edge cases well

## Audit

<details>
<summary>Debate audit</summary>

- Working tree: unchanged
- Turns: Author 3 commands, 1 re-run matched 1/1; Security rebuttal 1 command; Judge 0 commands
- Evidence voided: none
- Unresolved: none
</details>
```

---

## Implementation Notes

1. **Skills to load** are determined by Triage based on detected language/framework
2. **Pre-existing detection** requires git blame check (not just diff)
3. **Extended reasoning** should be collapsible in markdown renderers
4. **Positive findings** help balance the review tone
5. **Honored decisions** stay out of active severity counts and are summarized without restating the finding
6. **Expansion findings** require user approval even when an SDD proposes the expansion
7. **Blocking** means the change should not merge until resolved; spec-finish reads it directly
