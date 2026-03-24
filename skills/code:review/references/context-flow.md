# Context Flow Between Steps

This document describes how data flows between workflow steps in code review.

## rq (Request Review) Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Step 1: Get Diff                                                             │
│                                                                              │
│ Input:   <target> (branch name or PR number)                                 │
│ Output:  git_diff, files_changed                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Step 2: Triage (clerk agent)                                                 │
│                                                                              │
│ Input:   git_diff, files_changed                                             │
│ Output:  triage_result                                                       │
│          {                                                                   │
│            "context": { "language", "framework", "domain" },                 │
│            "reviewers": ["Security", "Correctness", ...],                     │
│            "skills_to_load": ["typescript:testing", "code:security"]         │
│          }                                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Step 3: Reviewers (parallel general subagents)                               │
│                                                                              │
│ Input:   git_diff, files_changed, triage_result.context,                     │
│          triage_result.skills_to_load                                        │
│                                                                              │
│ Each reviewer receives:                                                       │
│   - context: { language, framework, domain }                                 │
│   - files: files_changed                                                    │
│   - git_diff: full diff                                                    │
│   - skills_to_load: ["typescript:testing", "code:security"]                │
│                                                                              │
│ Output:  reviewer_findings[] (aggregated from all reviewers)                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Step 4: Synthesis (general subagent)                                         │
│                                                                              │
│ Input:   reviewer_findings[]                                                 │
│ Output:  synthesized_findings[]                                              │
│          [                                                                   │
│            { title, severity, locations[], issue, impact, suggestion,         │
│              pre_existing, flag_for_challenge, original_findings[] }         │
│          ]                                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Step 5: Architect (architect agent)                                          │
│                                                                              │
│ Input:   synthesized_findings[], triage_result.context                       │
│ Output:  architecture_findings[]                                             │
│          [                                                                   │
│            { location, severity, title, issue, impact, suggestion,          │
│              pre_existing }                                                  │
│          ]                                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Step 6: Challenge (oracle agent)                                             │
│                                                                              │
│ Input:   synthesized_findings[], architecture_findings[]                     │
│ Output:  validated_findings[]                                                │
│          [                                                                   │
│            { title, severity, locations[], issue, impact, suggestion,       │
│              pre_existing, reasoning: { why_flagged, verification,          │
│              evidence, alternative_view } }                                  │
│          ]                                                                   │
│          removed_findings[]                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Step 7: Final Synthesis (inline)                                             │
│                                                                              │
│ Input:   validated_findings[], removed_findings[]                             │
│ Output:  formatted_review_report                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## rs (Respond to Review) Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Step 1-2: Get Target + Fetch Discussions                                     │
│                                                                              │
│ Input:   <pr_number> or current branch                                       │
│ Output:  discussions[]                                                       │
│          [                                                                   │
│            { id, author, file, line, comment, replies[], status }          │
│          ]                                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Step 3: Triage Discussions (inline)                                          │
│                                                                              │
│ Input:   discussions[]                                                       │
│ Output:  actionable_discussions[]                                             │
│          [                                                                   │
│            { discussion, priority, category }                                │
│          ]                                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Step 4: Analysis (parallel general subagents)                                │
│                                                                              │
│ Input:   actionable_discussions[], triage_result.context                     │
│                                                                              │
│ Each analysis receives:                                                      │
│   - discussion: { author, file, line, comment, replies, status }            │
│   - code_snippet: relevant code from the file                                │
│   - language: detected from file extension                                   │
│   - skills_to_load: based on file type and category                          │
│                                                                              │
│ Output:  analyses[]                                                          │
│          [                                                                   │
│            { analysis, status_check, suggested_fix, suggested_response }     │
│          ]                                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Step 5: Validation (general subagent)                                        │
│                                                                              │
│ Input:   analyses[], pr_diff                                                 │
│ Output:  validations[]                                                       │
│          [                                                                   │
│            { discussion_id, fix_valid, concerns[], recommended_action,       │
│              confidence }                                                   │
│          ]                                                                   │
│          conflicts[]                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Step 6-10: Synthesize, Show, Confirm, Commit, Post (inline)                  │
│                                                                              │
│ Input:   analyses[], validations[], conflicts[]                              │
│ Output:  applied_fixes[], posted_responses[]                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Structures

### Triage Result

```typescript
interface TriageResult {
  context: {
    language: "typescript" | "python" | "go" | "rust" | string;
    framework?: string;
    domain: "web-api" | "frontend" | "database" | "infrastructure" | string;
  };
  reviewers: ReviewerType[];
  skills_to_load: string[];
}

type ReviewerType =
  | "Security"
  | "Performance"
  | "Correctness"
  | "Maintainability"
  | "Architecture"
  | "SecuritySkeptic"
  | "PerformanceOperator"
  | "MaintainabilityPedant"
  | "CorrectnessSkeptic"
  | "ArchitectureArchaeologist";
```

### Finding Structure

```typescript
interface Finding {
  location: string;        // "file:line"
  severity: "Critical" | "High" | "Medium" | "Low";
  title: string;
  issue: string;
  impact: string;
  suggestion: string;
  pre_existing: boolean;
}

interface ValidatedFinding extends Finding {
  locations: string[];
  reasoning: {
    why_flagged: string;
    verification: string;
    evidence: string;
    alternative_view?: string;
  };
}
```

## Skill Loading by Language

| Language | Skills to Load |
|----------|---------------|
| TypeScript | typescript:testing, typescript:fastify (if fastify), typescript:functional-patterns |
| Python | python:testing, python:fastapi (if fastapi), python:sqlalchemy (if sqlalchemy) |
| Go | None (use general patterns) |
| Rust | None (use general patterns) |

## Skill Loading by Category

| Category | Skills to Load |
|----------|---------------|
| Security | code:security |
| Performance | code:perf |
| Architecture | oracle:architect |
| Testing | Language-specific testing skill |
| Style/Quality | code:review (main skill) |

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Subagent Dispatch                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
              Success                          Failure
                    │                               │
                    ▼                               ▼
            Collect results              Log error, continue with
                    │                     partial results
                    ▼                               │
        All successful? ──────Yes──────► Continue to next step
                    │                               │
                    No                              ▼
                    │                      Any successful?
                    ▼                               │
        Continue with partial ◄───Yes────────────────┤
                    │                               │
                    │                               No
                    ▼                               │
        Report error to user                      ▼
        Abort review                          Report error to user
                                              Abort review
```
