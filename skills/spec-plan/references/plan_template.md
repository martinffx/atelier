## Context

Describe why the change is needed and summarize the relevant current behavior.
Include repository facts, constraints, dependencies, and prior work that the
implementation must preserve. Contrast the current and desired states when useful.

Write enough for an engineer unfamiliar with the immediate problem to understand
the plan. Do not repeat implementation steps that belong under Changes.

### Decisions

Include this subsection when the plan depends on meaningful implementation choices.

Record the chosen architecture, interfaces, ownership boundaries, data flow,
execution order, or technology choices. Explain why the selected approach fits
the existing codebase. Mention rejected alternatives only when doing so prevents
the implementer from revisiting a settled choice.

Omit this subsection when the implementation is mechanical or the repository
already dictates the approach.

### Scope

Include this subsection when the boundaries of the work are not obvious or when
closely related work must be explicitly excluded.

State what is in scope and out of scope. Identify behavior that must remain
unchanged and any adjacent systems, cleanup, or follow-up work that this plan
does not address.

Omit this subsection when the Context and Changes already make the boundaries
unambiguous.

## Changes

Describe the implementation in dependency order. Use a numbered list when there
is more than one change.

For each change:

- Start with the exact file path and a concise description.
- Name the affected functions, types, routes, configuration keys, or other symbols.
- Explain the current behavior when it matters to the change.
- Describe the required behavior and important implementation constraints.
- Explain cross-file wiring, data flow, error handling, and execution order where relevant.
- Identify files to create, modify, rename, or delete.
- Mention corresponding test changes alongside the behavior they verify.
- Use a short signature or pseudocode only when it removes material ambiguity.

The plan should provide enough detail for another engineer to implement without
rediscovering the approach, while avoiding line-by-line coding instructions.

## Known Limitations

Include this section only when the planned implementation intentionally leaves
limitations, risks, unsupported cases, deferred cleanup, or follow-up work.

Explain the practical impact of each limitation. Do not use this section for
unresolved decisions that must be settled before implementation.

Omit the entire section when there are no known limitations.

## Verification

List the concrete checks required after implementation.

For each check:

- Provide the exact command or manual action when known.
- State the expected outcome or invariant being verified.
- Include focused tests for changed behavior.
- Include broader build, test, lint, or type-check commands appropriate to the repository.
- Include repository searches or state checks when confirming removals, migrations,
  conflict resolution, generated files, or absence of stale references.
- Note any verification that cannot be performed locally and why.

Prefer the smallest focused check first, followed by broader regression checks.
