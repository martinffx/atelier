---
name: atelier-setup
description: Configure a repository for Atelier's development workflow. Use only when the user explicitly invokes atelier-setup; it inspects existing repository instructions and domain-document conventions, previews an idempotent project-guidance update, and writes only after approval. It does not install Atelier, configure a harness, or scaffold empty workflow artifacts.
user-invocable: true
disable-model-invocation: true
---

# Atelier Setup

Set up the repository conventions that Atelier skills need without taking ownership of the
developer's installation, harness configuration, or project structure. Explore first, present
the proposed edit exactly, and write only after the developer approves it.

## 1. Explore

Read the repository before proposing any change:

- Root `AGENTS.md` and `CLAUDE.md`, if present. Note whether either already has an `## Atelier`
  heading.
- Root `CONTEXT.md` and `CONTEXT-MAP.md`.
- `docs/adr/` and any context-local `docs/adr/` directories.
- Genuine monorepo signals: a workspace manifest, or multiple independently deployable packages
  with their own source directories.

Do not create, install, configure, or modify anything during exploration.

## 2. Present Findings

Summarize what exists and recommend a domain-document layout:

- **Single-context** is the default: domain language belongs in root `CONTEXT.md`; architectural
  decisions belong in root `docs/adr/`.
- **Multi-context** is appropriate only when the repository has genuinely separate bounded
  contexts. `CONTEXT-MAP.md` belongs at the root and points to each context's `CONTEXT.md` and
  `docs/adr/` directory.

Explain that these documents remain lazy: do not create `CONTEXT.md`, `CONTEXT-MAP.md`, or an ADR
directory until another Atelier skill has resolved terminology or made a decision worth recording.

Select the instruction file to edit:

1. If both files exist, ask which file should own the Atelier guidance; do not duplicate it.
2. Otherwise use root `AGENTS.md` when it exists.
3. Otherwise use root `CLAUDE.md` when it exists.
4. If neither exists, ask which instruction file to create; do not choose on the developer's behalf.

Show the developer the selected file, domain layout, and the exact `## Atelier` block that will be
written. Stop and wait for explicit approval.

## 3. Write After Approval

Add the following block to the selected instruction file, adapting only the domain-layout sentence
to the approved recommendation:

```markdown
## Atelier

This repository uses Atelier's plan-first development workflow. Invoke `atelier-orchestrator` at
the start of work; it selects an Inline Plan for bounded changes or a Spec-backed Plan when durable
design and coordination artifacts are warranted.

Domain documentation uses the selected layout. Keep `CONTEXT.md` focused on domain language and
record architectural decisions as ADRs. Create these documents only when there is resolved content
to record.

Atelier installation and harness configuration are managed separately with `npx skills add
martinffx/atelier` and `npx @martinffx/atelier@latest init`.
```

If an `## Atelier` section already exists, replace that section in place rather than appending a
second one. Preserve all content outside that section, including user edits. Do not create any
other files or directories.

## 4. Report

State which instruction file changed and the chosen domain-document layout. Remind the developer
that the layout is a convention only: the first domain-modelling or architectural-decision task
creates the relevant documents when it has substantive content.
