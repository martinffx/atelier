# Respond to Review (rs) Workflow

## Overview

This workflow responds to PR review feedback.

**Requires gfreview.**

Steps:
0. Check gfreview installed
1. Get target PR
2. Fetch discussions
3. Triage discussions (inline)
4. Analysis Subagents (parallel)
5. Validation Subagent
6. Confirm fixes with user [y/N/a]
7. Commit and push
8. Post responses [y/N]
9. Summary

---

## Step 0: Check Prerequisites

**rs requires gfreview.**

```bash
which gfreview 2>/dev/null && gfreview --version
```

If not installed:

```
Error: rs requires gfreview.

Install from: https://github.com/martinffx/gfreview

curl -fsSL https://raw.githubusercontent.com/martinffx/gfreview/main/install.sh | bash

After installation, run `rs` again.
```

Abort workflow if gfreview not available.

---

## Step 1: Get Target

- If `$1` provided: use as PR number
- If no `$1`: find PR for current branch
```bash
gh pr list --head $(git branch --show-current) --json number --jq '.[0].number'
```

---

## Step 2: Fetch Discussions

```bash
gfreview discussions <id>
```

Parse discussion thread structure:
- Main comment
- Reply thread
- Resolution status
- Author

---

## Step 3: Triage Discussions

Group and prioritize (done **inline**, no subagent):
- Skip already-resolved discussions
- Group related comments (same issue, different files)
- Prioritize: Blocker > Issue > Suggestion > Nit
- Identify quick wins vs complex fixes

---

## Step 4: Analysis Subagents (Parallel)

**Purpose:** Analyze each discussion thread and suggest fixes.

**Uses:** `general` subagent - One per discussion, dispatched concurrently

**Pattern:** Spawn one subagent per actionable discussion **concurrently**.

### Subagent Invocation (One per Discussion)

```yaml
subagent_type: general
description: "Analyze PR discussion thread"
prompt: |
  Analyze this code review discussion and suggest how to address it.

  DISCUSSION:
  - Author: @{author}
  - File: {file_path}
  - Line: {line_number}
  - Comment: {main_comment}
  - Thread replies: {replies}
  - Current resolution status: {status}

  RELEVANT CODE:
  ```{language}
  {code_snippet}
  ```

  **PRE-STEP: Load Relevant Skills**
  Before analyzing, load skills based on file type and discussion topic:
  - Use `skill` tool to load: {language}:testing (if available)
  - Use `skill` tool to load: code-security (if security-related)
  - Use `skill` tool to load: code-perf (if performance-related)
  - Use `skill` tool to load: oracle-architect (if architecture-related)

  Tasks:
  1. Load relevant skills using the `skill` tool
  2. Understand what the reviewer is asking for
  3. Identify the specific issue or suggestion
  4. Determine the exact code location that needs changes
  5. Check if this has already been addressed in recent commits (check git log)
  6. Suggest a concrete fix or appropriate response

  CRITICAL: Be specific. Include exact file paths, line numbers, and code changes.

  Return JSON:
  {
    "analysis": {
      "understanding": "Clear description of what reviewer wants",
      "issue_type": "bug|suggestion|question|style|documentation",
      "severity": "Blocker|Issue|Suggestion|Nit",
      "location": {
        "file": "exact/path/to/file.ts",
        "line": 42,
        "snippet": "relevant code"
      }
    },
    "status_check": {
      "already_addressed": true|false,
      "addressed_in_commit": "abc123 (if applicable)"
    },
    "suggested_fix": {
      "applicable": true|false,
      "description": "What change to make",
      "before": "original code",
      "after": "fixed code"
    },
    "suggested_response": {
      "text": "Response to post on PR",
      "tone": "agree|disagree|question|acknowledge"
    }
  }
```

### Parallel Execution Pattern

```
Concurrent invocations (one per actionable discussion):
├── Discussion #1: "Missing validation on line 45"
├── Discussion #2: "Consider using const instead of let"
├── Discussion #3: "This could cause N+1 query"
└── Discussion #4: "Typo in comment"
```

### Error Handling (per code-subagents)

- If a subagent fails/times out: Log error, continue with other discussions
- If all subagents fail: Report error to user
- Partial results: Use analyses from successful subagents only

---

## Step 5: Validation Subagent

**Purpose:** Validate that suggested fixes don't introduce problems.

### Subagent Invocation

```yaml
subagent_type: general
description: "Validate suggested code review fixes"
prompt: |
  Validate these suggested fixes for code review feedback.

  SUGGESTED FIXES:
  {all_analyses_json}

  FULL DIFF CONTEXT:
  {pr_diff}

  Tasks:
  For each suggested fix:
  1. Does this actually address the issue raised?
  2. Could this introduce new problems or regressions?
  3. Is the response tone appropriate and professional?
  4. Are there any edge cases not considered?

  Return JSON:
  {
    "validations": [
      {
        "discussion_id": "identifier",
        "fix_valid": true|false,
        "concerns": ["List any concerns or risks"],
        "recommended_action": "apply|skip|modify",
        "confidence": "high|medium|low"
      }
    ],
    "conflicts": [
      {
        "between": ["fix_a", "fix_b"],
        "description": "How they conflict"
      }
    ]
  }
```

---

## Step 6: Synthesize (Inline)

Merge analyses and validations (done **inline**):
- Dedupe overlapping fixes
- Group by file
- Order by priority

---

## Step 7: Show Analysis and Confirm Fixes

### Show Analysis

Present each discussion:

```
Discussion #1 with @{author}:
> {main_comment}

Thread: {replies if any}

Analysis:
- Understanding: {understanding}
- Issue: {issue_type}
- Suggested fix: {description}
- Validation: {concerns if any}
```

### Confirm Fixes with User

**Always ask user before applying fixes.**

For each suggested fix:

```
{file}:{line} - {suggestion}

Apply this fix? [y/N/a]
- y: Apply this fix only
- N: Skip this fix
- a: Apply all remaining fixes without asking
```

**CRITICAL:** Never apply changes without user confirmation.

If `a` selected: Set flag `APPLY_ALL=true`, skip remaining confirmations.

---

## Step 8: Commit and Push

If fixes were applied:

```
Commit these changes? [y/N]
```

If yes:
```bash
git add <files>
git commit -m "fix: <summary of changes> (review feedback)"
git push
```

If `APPLY_ALL=true`: Commit automatically without asking.

---

## Step 9: Post Responses

```
Post {N} responses to PR comments? [y/N]
```

If yes:
```bash
gfreview review start <id>

# For each addressed comment:
gfreview review comment <id> --file <path> --line <n> --body "Response: <message>"

gfreview review submit <id> --body "Addressed review feedback."
```

---

## Step 10: Summary

Show summary of actions taken:

```
=== Review Response Summary ===
Fixes applied: N
Responses posted: N
Remaining discussions: N
```

---

## Subagent Summary

| Step | Subagent | Uses | Parallel? | Purpose |
|------|----------|------|----------|---------|
| 0 | Prereqs | inline | — | Check gfreview installed |
| 1 | Get Target | inline | — | Find PR for branch |
| 2 | Fetch | inline | — | gfreview discussions |
| 3 | Triage | inline | — | Prioritize discussions |
| 4 | Analysis | `general` subagent | Yes (per discussion) | Analyze feedback (loads relevant skills) |
| 5 | Validation | `general` subagent | No | Validate fixes for safety |
| 6 | Confirm | inline | — | Ask user [y/N/a] before applying fixes |
| 7 | Commit | inline | — | Commit and push |
| 8 | Respond | inline | — | Ask user [y/N], post responses |
| 9 | Summary | inline | — | Show actions taken |
