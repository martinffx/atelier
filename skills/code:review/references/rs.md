# Respond to Review (rs) Workflow

## Overview

This workflow uses **2 subagent invocations** plus inline processing:
1. **Analysis Subagents** (parallel) - One per discussion thread
2. **Validation Subagent** - Validates suggested fixes

Follows the [code:subagents](../SKILL.md) patterns for dispatch and error handling.

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

  LOAD RELEVANT SKILLS FIRST:
  Based on the file type ({language}) and discussion topic, load relevant skills:
  - Use `skill` tool to load: {language}:testing (if available)
  - Use `skill` tool to load: code:security (if security-related)
  - Use `skill` tool to load: code:perf (if performance-related)
  - Use `skill` tool to load: oracle:architect (if architecture-related)

  These skills contain patterns and guidance to help you analyze the feedback accurately.

  Tasks:
  1. Load relevant skills based on the discussion topic
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

### Error Handling (per code:subagents)

- If a subagent fails/times out: Log error, continue with other discussions
- If all subagents fail: Report error to user
- Partial results: Use analyses from successful subagents only

### Aggregating Results

Collect analyses from all subagents:

```python
all_analyses = []
for discussion in actionable_discussions:
    result = await analysis_subagent(discussion)
    if result.success:
        all_analyses.append(result.analysis)
```

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

## Step 7: Show Analysis

Present each discussion with:

**Discussion with @author:**
> <main comment>

**Thread:** <replies if any>

**Analysis:**
- Understanding: ...
- Issue: ...
- Suggested fix: ...
- Suggested response: ...
- Validation: <any concerns from validation subagent>

---

## Step 8: Confirm Fixes

For each suggested fix:

"<file>:<line> - <suggestion>. Apply this fix? [y/N/q]"

- y: Apply this fix
- N: Skip this fix
- q: Stop asking, skip remaining

**CRITICAL:** Never apply changes without user confirmation.

---

## Step 9: Commit and Push

If fixes were applied:

Generate commit message from applied fixes:
```bash
git add <files>
git commit -m "fix: <summary of changes> (review feedback)"
git push
```

---

## Step 10: Post Responses

For each addressed comment:

```bash
gfreview review start <id>
gfreview review comment <id> --file <path> --line <n> --body "Response: <message>"
gfreview review submit <id>
```

---

## Subagent Summary

| Step | Subagent Type | Parallel? | Purpose |
|------|--------------|-----------|---------|
| 4 | general | Yes (per discussion) | Analyze feedback and suggest fixes |
| 5 | general | No | Validate fixes for safety |
