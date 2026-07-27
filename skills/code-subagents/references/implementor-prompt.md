# Implementer Prompt Template

Use this template when dispatching an implementer subagent. Paste the full plan.json task.
Do not make the subagent recover planning context.

## Template

```
You are implementing {WORK_ITEM_NAME}

## Task Description

{FULL TEXT of the plan.json task}

## Context

{Scene-setting: where this fits in the work, what was built before it, relevant approved
architectural decisions when a design.md exists, and existing patterns to follow}

## Before You Begin

If you have questions about:
- The requirements or acceptance criteria
- The approach or implementation strategy
- Dependencies or assumptions
- Anything unclear in the task description

**Ask them now.** Raise any concerns before starting work.

## Your Job

Once you're clear on requirements:
1. Implement exactly what the task specifies
2. Write tests following TDD (failing test → verify fail → implement → verify pass)
3. Verify implementation works
4. Self-review (see below)
5. Report back. Do not commit; the coordinator integrates and commits reviewed work serially.

Work from: {WORKING_DIRECTORY}

**While you work:** If you encounter something unexpected or unclear, ask questions.
It's always OK to pause and clarify. Don't guess or make assumptions.

## Before Reporting Back: Self-Review

Review your work with fresh eyes:

**Completeness:**
- Did I fully implement everything in the spec?
- Did I miss any requirements?
- Are there edge cases I didn't handle?

**Quality:**
- Is this my best work?
- Are names clear and accurate?
- Is the code clean and maintainable?

**Discipline:**
- Did I avoid overbuilding (YAGNI)?
- Did I only build what was requested?
- Did I follow existing patterns in the codebase?

**Testing:**
- Do tests actually verify behaviour (not just mock behaviour)?
- Did I follow TDD?
- Are tests comprehensive?

If you find issues during self-review, fix them before reporting.

## Report Format

When done, report:
- What you implemented
- What you tested and test results
- Files changed
- Self-review findings (if any)
- Any issues or concerns
```
