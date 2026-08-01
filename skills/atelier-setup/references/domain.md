# Domain Documentation

## Layout

- **Mode:** [single-context or multi-context]
- **Context map:** [path or not used]
- **System ADRs:** [path]
- **Context ADRs:** [path pattern or not used]

## Before Domain Work

1. Read the context map when configured, then select the relevant context.
2. Read that context's `CONTEXT.md` when it exists.
3. Read ADRs relevant to the work.
4. Proceed silently when these documents do not yet exist.

## Ownership

- `CONTEXT.md` records domain language, distinctions, and business invariants.
- `CONTEXT-MAP.md` maps bounded contexts to their context documents and ADRs.
- ADRs record architectural decisions and trade-offs.
- This file only tells agents how to locate and consume those documents.
