---
name: spec:subagents
description: >
  Subagent dispatch patterns for implementation tasks. Use when spec:implement has multiple
  tasks to execute and subagents are available. Covers parallel dispatch for independent work,
  the two-stage review cycle (spec compliance then code quality), focused prompt construction,
  and integration of results. Trigger when executing plan tasks with subagent support, when
  facing 2+ independent problems, or when the user asks to use subagents for implementation.
user-invocable: false
---

# Spec Subagents

Fresh subagent per task. Two-stage review after each. Parallel when independent, sequential
when dependent.

## When to Use Subagents

**Use when:**
- Executing tasks from plan.json with subagent support available
- 2+ independent tasks that don't share state or files
- Each problem can be understood without context from others

**Don't use when:**
- Tasks are tightly coupled (editing the same files)
- You need to understand full system state across tasks
- Failures are related (fixing one might fix others)
- Exploratory work where the problem isn't well-defined yet

## Dispatch Modes

### Sequential (dependent tasks)

Tasks with dependencies execute one at a time. Each gets a fresh subagent — no context
pollution from previous tasks.

```
Task 1 (Entity) → review → complete
Task 2 (Repository, depends on T1) → review → complete
Task 3 (Service, depends on T2) → review → complete
```

### Parallel (independent tasks)

Independent tasks dispatch simultaneously. One agent per problem domain.

```
Task A (auth tests) ──→ review → complete
Task B (billing tests) ──→ review → complete    ← concurrent
Task C (notification tests) ──→ review → complete
```

**Independence check:** Would fixing Task A affect Task B? Would they edit the same files?
If no to both, dispatch in parallel.

---

## Writing Subagent Prompts

Good prompts are focused, self-contained, and specific about output.

### Structure

```markdown
## Task
[One sentence: what to build/fix]

## Context
[What the subagent needs to know about the codebase, domain, existing patterns]

## Scope
- Files to create: [exact paths]
- Files to modify: [exact paths]
- Test files: [exact paths]

## Steps
[From plan.json — the bite-sized TDD steps]

## Constraints
- Do NOT modify files outside scope
- Follow TDD: write failing test → verify fail → implement → verify pass
- Follow existing patterns in [reference file]

## Expected Output
- Summary of what you implemented
- Test results
- Any issues or questions encountered
```

### Prompt quality rules

- **Focused** — one task, one problem domain
- **Self-contained** — all context needed is in the prompt. Don't make the subagent
  read the plan file; provide the full task text
- **Specific about files** — exact paths, not "the relevant files"
- **Specific about output** — what should the subagent return?
- **Constrained** — what should they NOT touch?

### Common mistakes

| Mistake | Fix |
|---------|-----|
| "Fix all the tests" | "Fix the 3 failures in user.test.ts" |
| No context about codebase | Paste the relevant patterns and conventions |
| No constraints | "Do NOT change production code" or scope to specific files |
| Vague output expectations | "Return: root cause, changes made, test results" |

---

## Two-Stage Review

Every completed task gets two reviews in order. Do not skip either. Do not reverse the order.

### Stage 1: Spec Compliance

Does the implementation match what was specified?

```markdown
## Spec Review

Review the implementation against the task specification:

**Task spec:** [paste task from plan.json]

**Files changed:** [list from subagent output]

Check:
1. Are all requirements from the task spec implemented?
2. Is anything implemented that wasn't specified? (over-building)
3. Do tests cover the specified acceptance criteria?
4. Does the implementation match the design in spec.md?

Report: List any gaps or extras. Mark ✅ if compliant, ❌ if not.
```

If the spec reviewer finds issues → the implementer subagent fixes them → spec reviewer
reviews again. Repeat until ✅.

### Stage 2: Code Quality

Is the implementation well-built?

```markdown
## Code Quality Review

Review the implementation for code quality:

**Files changed:** [list]

Check:
1. Does the code follow existing patterns and conventions?
2. Are tests meaningful (not just asserting true)?
3. Is there unnecessary complexity?
4. Are edge cases handled?
5. Is the code clean (no dead code, no unnecessary comments)?

Rate issues as Critical (blocks merge), Important (should fix), or Minor (nice to have).
```

If the quality reviewer finds Critical or Important issues → implementer fixes → reviewer
reviews again. Minor issues can be noted and moved past.

### Why this order matters

Spec compliance first because there's no point polishing code that doesn't meet the spec.
Quality second because compliant code still needs to be well-built.

---

## Handling Subagent Questions

Subagents may ask questions before or during implementation. This is good — it means
they're thinking rather than guessing.

- Answer clearly and completely
- Provide additional context if needed
- Don't rush them into implementation
- If the question reveals a gap in the plan, that's valuable — note it

---

## Integrating Results

After subagents complete (especially parallel dispatch):

1. **Read each summary** — understand what changed
2. **Check for conflicts** — did any agents edit the same code?
3. **Run full test suite** — verify all changes work together
4. **Update task tracking** — mark tasks complete using the loaded task tracking skill

If there are conflicts between parallel results, resolve them manually. Don't dispatch
another subagent to merge — that requires too much context.

---

## When Subagents Fail

If a subagent fails a task:

- **Don't fix it manually** — that pollutes your context
- **Dispatch a fix subagent** with specific instructions about what went wrong
- **If it fails twice**, stop and escalate to the human. The plan may need revision.

If failure reveals a design problem:

> "This task is failing because [reason]. The design in spec.md may need to change.
> Want me to go back to spec:design?"
