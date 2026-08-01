---
name: atelier-setup
description: Configure a repository for Atelier's development workflow. Use only when explicitly invoked; inspect existing guidance, issue-tracker and domain-document conventions, preview the proposed configuration, and write only after approval. It does not install Atelier or initialize external tooling.
user-invocable: true
disable-model-invocation: true
---

# Atelier Setup

Set up repository guidance that Atelier skills need without taking ownership of the developer's
installation, harness configuration, or project structure. Explore first, present every proposed
edit exactly, and write only after the developer approves it.

## 1. Explore

Read the repository before proposing any change:

- Root `AGENTS.md` and `CLAUDE.md`, if present. Note whether either already has an `## Agent skills`
  heading.
- Root `CONTEXT.md` and `CONTEXT-MAP.md`.
- `docs/adr/` and any context-local `docs/adr/` directories.
- `docs/agents/`, including existing `issue-tracker.md` and `domain.md`.
- Existing issue-tracker conventions: remotes, issue links in documentation, local issue
  directories, and project guidance.
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

Explain that domain documents remain lazy: do not create `CONTEXT.md`, `CONTEXT-MAP.md`, or an ADR
directory until another Atelier skill has resolved terminology or made a decision worth recording.

Select or confirm the issue tracker:

1. If `docs/agents/issue-tracker.md` already defines one, preserve it unless the developer asks to
   change it.
2. Otherwise recommend the tracker indicated by existing repository practice, then ask the
   developer to confirm or describe their tracker.
3. Accept GitHub, GitLab, local Markdown, another tracker described by the developer, or `none`.
4. Record the chosen workflow in `docs/agents/issue-tracker.md`; do not install, initialize, or
   create external tracker resources.

Select the instruction file to edit:

1. If both files exist, ask which file should own the agent guidance; do not duplicate it.
2. Otherwise use root `AGENTS.md` when it exists.
3. Otherwise use root `CLAUDE.md` when it exists.
4. If neither exists, ask which instruction file to create; do not choose on the developer's behalf.

Show the developer the selected file, domain layout, and exact contents for:

- the `## Agent skills` block;
- `docs/agents/issue-tracker.md` using `references/issue-tracker.md`;
- `docs/agents/domain.md` using `references/domain.md`.

Stop and wait for explicit approval.

## 3. Write After Approval

Add the following block to the selected instruction file:

```markdown
## Agent skills

### Planning and implementation

Use `atelier-orchestrator` at the start of development work. It selects an Inline Plan for bounded
changes or a Spec-backed Plan when durable design and coordination artifacts are warranted.

### Issue tracking

Read `docs/agents/issue-tracker.md` when issue tracking is relevant. It defines this repository's
tracker workflow; `plan.json` remains authoritative for Spec-backed task details and dependencies.

### Domain documentation

Read `docs/agents/domain.md` before working in a domain area. It defines how to locate and use this
repository's context documents and ADRs.
```

If an `## Agent skills` section already exists, update the `### Planning and implementation`,
`### Issue tracking`, and `### Domain documentation` subsections in place rather than appending
duplicates. Preserve other subsections and all content outside the section, including user edits.

Create `docs/agents/` when needed, then write the approved tracker and domain documents. Do not
create any other files or directories.

## 4. Report

State which instruction file and agent documents changed, the selected tracker, and the chosen
domain-document layout. Remind the developer that the layout is a convention only: the first
domain-modelling or architectural-decision task creates the relevant documents when it has
substantive content.
