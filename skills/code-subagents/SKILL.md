---
name: code-subagents
description: >
  Implementation subagent dispatch patterns. Use when independent implementation work is
  available and subagents can execute it. Covers parallel dispatch, shared-tree patch
  snapshots, one combined review per completed batch, and serial integration.
user-invocable: false
---

# Implementation Subagents

Fresh subagent per task. One combined review per completed batch. Parallel when independent,
sequential when dependent.

## When to Use Subagents

**Use when:**
- 2+ independent work items do not share state or files
- Each work item has explicit requirements, constraints, files, and validation
- Each problem can be understood without context from the other work items

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

For shared-tree parallel work:

1. Assign each task an exclusive file list before dispatch
2. Do not let implementers stage or commit changes
3. Capture full `git status`, including untracked files, before and after each task
4. Capture the task's path-scoped patch and reject changes outside its assigned paths
5. Run tasks sequentially if their file ownership overlaps or cannot be isolated

---

## Prompt Templates

Use these templates when dispatching subagents. Each template is battle-tested — don't
improvise, use them as-is and fill in the variables.

- **[references/implementor-prompt.md](references/implementor-prompt.md)** — Dispatch an implementer. Includes self-review checklist.
- **[references/batch-reviewer-prompt.md](references/batch-reviewer-prompt.md)** — Combined plan and code-quality review for one completed batch.

### Prompt quality rules

- **Focused** — one task, one problem domain
- **Self-contained** — all context needed is in the prompt. Provide the complete work-item
  requirements; do not make the subagent recover context
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

## Batch Review

Run one combined review after every completed batch, not separate reviews for each task.

Give one fresh reviewer:

- The complete requirements for work items in the batch
- The relevant constraints
- The path-scoped patch captured for each task
- The full changed-file inventory, including untracked files
- The implementers' reports and validation results

The reviewer checks both requirements compliance and code quality:

1. Every requirement and acceptance criterion is implemented
2. The batch follows the supplied constraints
3. No unrequested work or out-of-scope files are included
4. Tests are meaningful and cover the right boundaries
5. The code follows existing patterns without unnecessary complexity

Use [references/batch-reviewer-prompt.md](references/batch-reviewer-prompt.md) as written.

If the reviewer finds Critical or Important issues, send each issue back to the relevant
implementer, refresh its path-scoped patch, and review the batch again. Minor issues may be
noted and moved past.

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
2. **Capture task patches** — use each task's exclusive file list
3. **Review the batch** — one combined requirements and quality review
4. **Run full test suite** — verify all changes work together
5. **Commit** — the coordinator commits the reviewed batch serially
6. **Update progress tracking** — when the caller uses it

If there are conflicts between parallel results, resolve them manually. Don't dispatch
another subagent to merge — that requires too much context.

---

## When Subagents Fail

If a subagent fails a task:

- **Don't fix it manually** — that pollutes your context
- **Dispatch a fix subagent** with specific instructions about what went wrong
- **If it fails twice**, stop and escalate to the human. The requirements or constraints may
  need revision.
