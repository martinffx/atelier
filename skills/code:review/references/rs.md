# Respond to Review (rs) Workflow

## Step 1: Get Target

- If `$1` provided: use as PR number
- If no `$1`: find PR for current branch
```bash
gh pr list --head $(git branch --show-current) --json number --jq '.[0].number'
```

## Step 2: Fetch Discussions

```bash
gfreview discussions <id>
```

Parse discussion thread structure:
- Main comment
- Reply thread
- Resolution status
- Author

## Step 3: Triage Discussions

Group and prioritize:
- Skip already-resolved discussions
- Group related comments (same issue, different files)
- Prioritize: Blocker > Issue > Suggestion > Nit
- Identify quick wins vs complex fixes

## Step 4: Analyze Comments (Parallel)

For each actionable discussion, invoke subagent:

**Skill Loading:**
- Detect files/topics from discussion
- Load relevant skills (e.g., `typescript:testing` for TypeScript comments)

**Prompt:**
```
You are analyzing a code review comment.

Discussion: <thread>
File: <path>
Line: <n>
Author: @username

Tasks:
1. Understand what the reviewer is asking
2. Identify the issue or suggestion
3. Determine affected code location
4. Check if already addressed in recent commits
5. Suggest a fix or response

Output:
```json
{
  "understanding": "...",
  "issue": "...",
  "location": {"file": "...", "line": n},
  "already_addressed": false,
  "suggested_fix": "...",
  "suggested_response": "..."
}
```
```

## Step 5: Validate Fixes

For each suggested fix, check:
1. Does this address the actual issue?
2. Does this introduce new problems?
3. Is the response appropriate and professional?

Flag any fixes that may cause regressions.

## Step 6: Synthesize

Merge analyses:
- Dedupe overlapping fixes
- Group by file
- Order by priority

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
- Validation: <any concerns>

## Step 8: Confirm Fixes

For each suggested fix:

"<file>:<line> - <suggestion>. Apply this fix? [y/N/q]"

- y: Apply this fix
- N: Skip this fix  
- q: Stop asking, skip remaining

**CRITICAL:** Never apply changes without user confirmation.

## Step 9: Commit and Push

If fixes were applied:

Generate commit message from applied fixes:
```bash
git add <files>
git commit -m "fix: <summary of changes> (review feedback)"
git push
```

## Step 10: Post Responses

For each addressed comment:

```bash
gfreview review start <id>
gfreview review comment <id> --file <path> --line <n> --body "Response: <message>"
gfreview review submit <id>
```
