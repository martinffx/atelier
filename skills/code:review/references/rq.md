# Request Review (rq) Workflow

## Step 1: Get Diff

```bash
git diff <target>
```

If target is a PR number:
```bash
gfreview diff <id>
```

## Step 2: Triage Agent

Invoke Task tool to analyze diff and:
- Detect language, framework, domain
- Select reviewers from pool
- List skills to load

Output:
```json
{
  "context": { "language": "...", "framework": "...", "domain": "..." },
  "reviewers": ["Security", "Correctness", "PerformanceOperator"],
  "skills": ["typescript:testing", "code:security"]
}
```

## Step 3: Reviewer Agents (Parallel)

For each selected reviewer:
1. Load relevant skills
2. Invoke Task tool with reviewer prompt (see [reviewers.md](./reviewers.md))
3. Collect findings

## Step 4: Synthesizer (First Pass)

Group findings:
- Deduplicate overlapping feedback
- Initial severity assignment
- Flag potential false positives

## Step 5: Challenge

Invoke `oracle:challenge` skill:
- "Is this handled elsewhere?"
- "Is this the correct place?"
- "Is this a valid concern?"

## Step 6: Synthesizer (Final)

- Final severity ranking
- Pre-existing vs introduced
- Extended reasoning sections

## Step 7: Show Findings

Present structured findings (see [output.md](./output.md)).

## Step 8: Ask to Post

"Post findings to PR via gfreview? [y/N]"

If yes, see [gfreview.md](./gfreview.md) for posting workflow.
