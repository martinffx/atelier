# Adversarial Reviewer Prompt Template

Use this prompt when spawning a fresh-context reviewer via the `task` tool.
The reviewer must receive **ARTIFACT + CONTRACT only** — never the CLAIM or orchestrator's reasoning.

## Template

```
Adversarial review. Find what is wrong with this artifact.
Assume the author is overconfident. Look for:
- Unstated assumptions
- Edge cases not handled
- Hidden coupling or shared state
- Ways the contract could be violated
- Existing conventions this might break
- Failure modes under unexpected input

Do NOT validate. Do NOT summarize. Find issues, or state explicitly
that you cannot find any after thorough examination.

ARTIFACT:
{ARTIFACT}

CONTRACT:
{CONTRACT}
```

## Dispatch via task tool

Spawn **parallel** subagents for cross-perspective review:

```
# Reviewer 1: oracle perspective
<task tool call with subagent_type="oracle">

# Reviewer 2: architect perspective
<task tool call with subagent_type="architect">
```

Each receives the **same** adversarial prompt above with ARTIFACT and CONTRACT.

## Rules

- **Never pass the CLAIM** — handing the reviewer your conclusion biases them toward agreement
- **Never pass your reasoning** — the reviewer must independently determine whether the artifact satisfies the contract
- **Paste this prompt verbatim** — it overrides any persona's default response shape (which may be balanced/validating)
- **No session context** — the subagent starts fresh with only this prompt