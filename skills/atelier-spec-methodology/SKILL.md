---
name: methodology
description: AgentOS 3-layer context, orchestrated delegation, and OpenSpec living specifications. Use when explaining how context flows through layers, how agents collaborate, or how specs evolve.
user-invocable: false
---

# Spec-Driven Development Methodology

This plugin combines three innovations: AgentOS context layers and delegation, OpenSpec living specifications, and Beads dependency tracking.

## 3-Layer Context Model (AgentOS)

Rather than overwhelming agents with all knowledge at once, provide contextually relevant information at the right moments:

| Layer | Contains | Purpose | Location |
|-------|----------|---------|----------|
| **Standards** | Coding conventions, architecture patterns | How you build | `docs/standards/` |
| **Product** | Mission, users, roadmap | What and why | `docs/product/` |
| **Specs** | Requirements, design, tasks | What to build next | `docs/spec/<feature>/` |

Agents load only the context layer they need for their current task.

## Workflow Phases (AgentOS)

| AgentOS Phase | Our Command | Agents Used |
|---------------|-------------|-------------|
| Plan Product | (manual) | - |
| Shape Spec | `/spec:create` | clerk → oracle |
| Write Spec | `/spec:create` | architect → clerk |
| Create Tasks | `/spec:create` | architect (Beads) |
| Implement Tasks | `/spec:work` | direct implementation |
| Orchestrate Tasks | `/spec:work` | architect delegation |

## Orchestrated Delegation

Commands delegate to specialized subagents with controlled context:

| Agent | Model | Role |
|-------|-------|------|
| **clerk** | haiku | Fast context retrieval, file scaffolding |
| **oracle** | opus | Requirements interviews, strategic analysis |
| **architect** | opus | Technical design, task breakdown |

Pattern: Primary agent delegates to specialized subagents rather than trying to do everything itself.

## Living Specifications (OpenSpec)

**Core principle**: Align humans and AI on what to build before any code is written.

### Spec Format

- Requirements with SHALL/MUST language
- Scenarios as acceptance criteria
- Hierarchical: Requirements contain nested Scenarios

### Directory Structure

- `docs/spec/<feature>/spec.md` - Source of truth
- `docs/changes/<feature>/<change>/` - Proposed changes (proposal.md, delta.md, tasks.md)

### Delta Format (Brownfield Changes)

- **ADDED** Requirements - New capabilities
- **MODIFIED** Requirements - Altered behavior (complete updated text)
- **REMOVED** Requirements - Deprecated features

### Living Spec Cycle

1. Draft change proposal
2. Review until consensus
3. Implement tasks
4. Archive change, merge delta into spec

## Dependency Tracking (Beads)

Beads enforces implementation order through dependencies:

- `bd ready` surfaces next unblocked task
- Dependencies enforce bottom-up implementation (Entity → Repository → Service → Router)
- Git-backed persistence via `.beads/beads.jsonl`

Commands like `/spec:create` automatically create Beads epics with tasks ordered by technical dependencies.
