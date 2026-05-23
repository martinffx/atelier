# Request Review (rq) Workflow

## Overview

This workflow:
1. Gets diff (git diff against target branch)
2. Triage Subagent - Analyzes diff, selects reviewers, identifies skills to load
3. Reviewer Subagents (parallel) - Each selected reviewer analyzes code
4. Synthesis Subagent - Deduplicates findings
5. Architect Subagent - Architecture review
6. Challenge Subagent - Validates findings
7. Final synthesis and output

---

## Step 1: Get Diff

### Default: git diff to main

```bash
git diff main
```

If target branch specified:
```bash
git diff <branch>
```

Capture the list of changed files and the full diff.

---

## Step 2: Triage Subagent

**Purpose:** Analyze diff to determine context, select reviewers, identify skills to load.

**Uses:** `scout` agent - See [agents/scout.md](../../agents/scout.md)

### Subagent Invocation

```yaml
subagent_type: scout
description: "Triage diff for code review"
prompt: |
  Analyze this code diff to determine review needs.

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
  4. **Identify skills to load** based on detected language/framework:
     - TypeScript → typescript-testing, typescript-fastify (if fastify framework)
     - Python → python-testing, python-fastapi (if fastapi framework)
     

  Return ONLY valid JSON (no markdown, no code blocks):
  {
    "context": {
      "language": "typescript|python|go|...",
      "framework": "react|fastapi|...",
      "domain": "web-api|frontend|database|..."
    },
    "reviewers": ["Security", "Correctness"],
    "skills_to_load": ["typescript-testing"]
  }
```

### Expected Output

```json
{
  "context": { "language": "typescript", "framework": "fastify", "domain": "web-api" },
  "reviewers": ["Security", "Correctness", "PerformanceOperator"],
  "skills_to_load": ["typescript-testing"]
}
```

---

## Step 3: Reviewer Subagents (Parallel)

**Purpose:** Each selected reviewer analyzes the code from their specialty perspective.

**Uses:** `general` subagent - One per reviewer, dispatched concurrently

**Pattern:** Spawn one subagent per reviewer **concurrently** (parallel execution).

### Skill Loading Pre-Step

Before dispatching reviewers, the detected skills are passed to each reviewer:
```json
{
  "skills_to_load": ["typescript-testing"]
}
```

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

  **PRE-STEP: Load Relevant Skills**
  Before reviewing, load these skills:
  {skills_to_load}

  Use the `skill` tool to load each skill.

  DIFF:
  {git_diff}

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

**Uses:** `general` subagent

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

## Step 5: Architect Subagent

**Purpose:** Review architecture-specific concerns.

**Uses:** `architect` agent - See [agents/architect.md](../../agents/architect.md)

### Subagent Invocation

```yaml
subagent_type: architect
description: "Architecture review of code diff"
prompt: |
  You are an Architecture Reviewer analyzing structural issues.

  CONTEXT:
  - Language: {language}
  - Framework: {framework}
  - Files: {files}

  SYNTHESIZED FINDINGS:
  {synthesized_findings_json}

  **PRE-STEP: Load Relevant Skills**
  Before reviewing, load:
  - Use `skill` tool to load: oracle-architect

  Focus areas:
  - Boundary violations
  - Responsibility leakage
  - Dependency direction
  - Layer separation
  - SOLID violations
  - Data model design
  - API contract design

  Return findings as JSON:
  {
    "architecture_findings": [
      {
        "location": "file:line",
        "severity": "High|Medium",
        "title": "Architecture Finding",
        "issue": "What's wrong",
        "impact": "Architectural debt",
        "suggestion": "How to fix",
        "pre_existing": true|false
      }
    ]
  }
```

---

## Step 6: Challenge Subagent

**Purpose:** Validate findings by challenging assumptions.

**Uses:** `oracle` agent - See [agents/oracle.md](../../agents/oracle.md)

### Subagent Invocation

```yaml
subagent_type: oracle
description: "Challenge code review findings"
prompt: |
  Challenge these code review findings critically using sequential-thinking.

  ALL FINDINGS (includes synthesized + architecture):
  {all_findings_json}

  **PRE-STEP: Load Relevant Skills**
  Before challenging, load:
  - Use `skill` tool to load: oracle-challenge

  For each flagged finding, use `mcp__sequential-thinking__sequentialthinking` to analyze:
  1. Is this handled elsewhere in the codebase?
  2. Is this the correct place for this concern?
  3. Is this a valid concern or a false positive?
  4. What evidence supports or refutes this finding?
  5. What are alternative perspectives to consider?

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

## Step 7: Final Synthesis and Output

**Purpose:** Produce final report with extended reasoning sections.

This step is done **inline** (no subagent needed) - format the validated findings into the output structure defined in [output.md](./output.md).

Display findings in terminal per [output.md](./output.md).

---

## Subagent Summary

| Step | Subagent | Uses | Parallel? | Purpose |
|------|----------|------|----------|---------|
| 1 | Get Diff | inline | — | `git diff <branch>` |
| 2 | Triage | `scout` agent | No | Detect context, select reviewers, identify skills |
| 3 | Reviewers | `general` subagent | Yes (per reviewer) | Specialty analysis |
| 4 | Synthesis | `general` subagent | No | Deduplicate and group |
| 5 | Architect | `architect` agent | No | Architecture review |
| 6 | Challenge | `oracle` agent | No | Validate findings |
| 7 | Output | inline | — | Format and display findings |
