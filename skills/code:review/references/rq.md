# Request Review (rq) Workflow

## Overview

This workflow uses **4 distinct subagent invocations** in sequence:
1. **Triage Subagent** - Analyzes diff, selects reviewers
2. **Reviewer Subagents** (parallel) - Each selected reviewer analyzes code
3. **Challenge Subagent** - Validates findings
4. **Synthesis Subagent** - Produces final report

---

## Step 1: Get Diff

```bash
git diff <target>
```

If target is a PR number:
```bash
gfreview diff <id>
```

---

## Step 2: Triage Subagent

**Purpose:** Analyze diff to determine which reviewers are needed.

### Subagent Invocation

```yaml
subagent_type: general
description: "Triage diff for code review"
prompt: |
  Analyze this code diff and determine what type of review is needed.

  FILES: {files_changed}
  DIFF: {git_diff}

  Tasks:
  1. Detect the primary language and framework
  2. Identify the domain (web API, frontend, database, etc.)
  3. Select 3-5 reviewers from this list based on what's in the diff:
     - Security (auth, secrets, injection risks)
     - Performance (hot paths, queries, algorithms)
     - Correctness (logic, types, error handling)
     - Maintainability (naming, complexity, tests)
     - Architecture (boundaries, layers, SOLID)
     - SecuritySkeptic (security + failure scenarios)
     - PerformanceOperator (performance at scale)
     - MaintainabilityPedant (quality + precision)
  4. List skills that should be loaded based on detected language

  Return ONLY valid JSON (no markdown, no code blocks):
  {
    "context": {
      "language": "typescript|python|go|...",
      "framework": "react|fastapi|...",
      "domain": "web-api|frontend|database|..."
    },
    "reviewers": ["Security", "Correctness"],
    "skills": ["typescript:testing", "code:security"]
  }
```

### Expected Output

```json
{
  "context": { "language": "typescript", "framework": "fastify", "domain": "web-api" },
  "reviewers": ["Security", "Correctness", "PerformanceOperator"],
  "skills": ["typescript:testing", "code:security"]
}
```

---

## Step 3: Reviewer Subagents (Parallel)

**Purpose:** Each selected reviewer analyzes the code from their specialty perspective.

**Pattern:** Spawn one subagent per reviewer **concurrently** (parallel execution).

### Subagent Invocation (One per Reviewer)

```yaml
subagent_type: general
description: "Security review of code diff"
prompt: |
  You are a Security Reviewer analyzing code for security vulnerabilities.

  CONTEXT:
  - Language: {language}
  - Framework: {framework}
  - Files: {files}

  DIFF:
  {git_diff}

  LOAD RELEVANT SKILLS:
  Before reviewing, load any skills relevant to {language} and security:
  - Use `skill` tool to load: code:security
  - Use `skill` tool to load: {language}:testing (if available)

  Focus areas:
  - Authentication and authorization flaws
  - Injection vulnerabilities (SQL, command, XSS)
  - Secrets in code (API keys, passwords, tokens)
  - Surface area exposure
  - Input validation gaps

  Return findings as JSON array. For each finding:
  {
    "findings": [
      {
        "location": "file:line",
        "severity": "Critical|High|Medium|Low",
        "title": "Brief finding name",
        "issue": "What's wrong",
        "impact": "Why this matters",
        "suggestion": "How to fix",
        "pre_existing": true|false
      }
    ]
  }

  If no findings, return {"findings": []}
```

### Parallel Execution

Invoke **all reviewer subagents simultaneously**:

```
Concurrent invocations:
├── Security Reviewer
├── Correctness Reviewer
├── PerformanceOperator Reviewer
└── (etc. based on triage output)
```

### Error Handling

- If a subagent fails/times out: Log error, continue with other reviewers
- If all subagents fail: Report error to user, abort review
- Partial results: Use findings from successful reviewers only

### Aggregating Results

Collect findings from all reviewer subagents:

```python
all_findings = []
for reviewer in reviewers:
    result = await reviewer_subagent(reviewer)
    if result.success:
        all_findings.extend(result.findings)
```

---

## Step 4: Synthesis Subagent (First Pass)

**Purpose:** Group, deduplicate, and assign initial severity.

### Subagent Invocation

```yaml
subagent_type: general
description: "Synthesize code review findings"
prompt: |
  Synthesize these code review findings from multiple reviewers.

  RAW FINDINGS:
  {all_findings_json}

  Tasks:
  1. Deduplicate findings that refer to the same issue
  2. Flag potential false positives
  3. Assign initial severity based on consensus
  4. Group by severity (Critical, High, Medium, Low)

  Return JSON:
  {
    "synthesized": [
      {
        "title": "Finding title",
        "severity": "Critical|High|Medium|Low",
        "locations": ["file:line", "file:line"],
        "issue": "Consolidated issue description",
        "impact": "Why this matters",
        "suggestion": "How to fix",
        "pre_existing": true|false,
        "flag_for_challenge": true|false,
        "original_findings": ["Reviewer: finding summary"]
      }
    ]
  }
```

---

## Step 5: Challenge Subagent

**Purpose:** Validate findings by challenging assumptions.

### Subagent Invocation

```yaml
subagent_type: oracle:challenge
description: "Challenge code review findings"
prompt: |
  Challenge these code review findings critically.

  SYNTHESIZED FINDINGS:
  {synthesized_findings_json}

  For each flagged finding, answer:
  1. Is this handled elsewhere in the codebase?
  2. Is this the correct place for this concern?
  3. Is this a valid concern or a false positive?
  4. What evidence supports or refutes this finding?

  Return JSON with validated findings:
  {
    "validated": [
      {
        "title": "Finding title",
        "severity": "Critical|High|Medium|Low",
        "locations": ["file:line"],
        "issue": "Issue description",
        "impact": "Impact explanation",
        "suggestion": "Fix suggestion",
        "pre_existing": true|false,
        "reasoning": {
          "why_flagged": "What triggered the finding",
          "verification": "How it was validated",
          "evidence": "Code snippets or references",
          "alternative_view": "Other perspectives to consider"
        }
      }
    ],
    "removed": ["Finding titles that were false positives"]
  }
```

---

## Step 6: Final Synthesis

**Purpose:** Produce final report with extended reasoning sections.

This step is done **inline** (no subagent needed) - format the validated findings into the output structure defined in [output.md](./output.md).

---

## Step 7: Show Findings

Present structured findings (see [output.md](./output.md)).

---

## Step 8: Ask to Post

"Post findings to PR via gfreview? [y/N]"

If yes, see [gfreview.md](./gfreview.md) for posting workflow.

---

## Subagent Summary

| Step | Subagent Type | Parallel? | Purpose |
|------|--------------|-----------|---------|
| 2 | general | No | Analyze diff, select reviewers |
| 3 | general | Yes (per reviewer) | Specialty analysis |
| 4 | general | No | Deduplicate and group |
| 5 | oracle:challenge | No | Validate findings |
