---
name: atelier-spec-using-atelier
description: Invoke relevant skills BEFORE any response or action. Use when determining which skill to invoke, managing skill dependencies, or deciding when to load skills proactively.
user-invocable: false
---

# Skill Invocation Governance

This meta-skill governs when and how to invoke other skills. It ensures you proactively load relevant skills before taking any action, rather than relying on reactive skill matching.

## The Rule

**Before every response or action**, pause and ask: "Which skill(s) should I load for this task?"

### Flow Diagram

```
START: New Task/Question
          │
          ▼
┌─────────────────────────────────┐
│ Identify task domain/type       │
│ (debugging, testing, design)   │
└─────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ Check process skills first      │
│ (brainstorming, verification,   │
│  subagent-driven, etc.)         │
└─────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ Check domain skills next        │
│ (atelier-spec-*, atelier-*)    │
└─────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ Load ALL relevant skills       │
│ before responding               │
└─────────────────────────────────┘
          │
          ▼
      EXECUTE TASK
```

## Red Flags

Rationalization patterns that indicate skill invocation failure:

| Red Flag | Rationalization | Reality | Response |
|----------|------------------|---------|----------|
| "I know what I'm doing" | Skipping skill load | Knowledge gaps exist | Load skill proactively |
| "This is simple enough" | Avoiding process skills | Complexity often hidden | Apply systematic approach |
| "I'll figure it out" | Skipping domain skills | Better to use proven patterns | Load relevant skill |
| "I've done this before" | Ignoring domain evolution | Patterns may have changed | Check for updated skills |
| "Not worth the overhead" | Skipping verification | Bugs cost more later | Load verification skill |
| "I'll just start coding" | Skipping brainstorming | Solutions often flawed | Use brainstorming skill |

## Skill Priority

Always check process skills before domain skills:

1. **Process Skills** (how you work)
   - `brainstorming` - Before any creative work
   - `test-driven-development` - Before any implementation
   - `verification-before-completion` - Before claiming work done
   - `systematic-debugging` - Before proposing fixes
   - `executing-plans` - Before following implementation plans
   - `requesting-code-review` - Before merging changes

2. **Domain Skills** (what you work with)
   - Atelier skills: spec-*, code-*, oracle-*, typescript-*
   - Language skills: python-*, typescript-*
   - Framework skills: fastapi, drizzle-orm, dynamodb-toolbox, etc.

## Skill Types

### Rigid Skills (Must Use)

These skills must be loaded for specific triggers:

| Skill | Trigger |
|-------|---------|
| `brainstorming` | Creating features, components, adding functionality |
| `test-driven-development` | Implementing features or bug fixes |
| `systematic-debugging` | Bug, test failure, unexpected behavior |
| `verification-before-completion` | Claiming work is complete/fixed/passing |
| `writing-plans` | Has spec/requirements for multi-step task |
| `finishing-a-development-branch` | Implementation complete, deciding merge |
| `receiving-code-review` | Receiving code review feedback |

### Flexible Skills (Use When Relevant)

These skills match based on context:

| Category | Skills |
|----------|--------|
| Spec-Driven Dev | `atelier-spec-methodology`, `atelier-spec-architect`, `atelier-spec-beads`, `atelier-spec-product`, `atelier-spec-project-structure`, `atelier-spec-testing` |
| Python | `python:fastapi`, `python:sqlalchemy`, `python:testing`, `python:architecture`, `python:build-tools`, `python:monorepo` |
| TypeScript | `atelier-typescript-fastify`, `atelier-typescript-drizzle-orm`, `atelier-typescript-dynamodb-toolbox`, `atelier-typescript-effect-ts` |

## Tool Mapping for OpenCode

Use the Skill tool to load skills:

```python
skill(name="skill-name")
```

Load multiple skills when needed:

```python
skill(name="brainstorming")
skill(name="atelier-spec-architect")
```

## Skills Location

Available skills are stored in:

- **Superpowers**: `~/.config/opencode/skills/superpowers/`
- **Atelier**: `skills/atelier-*/`

Check available skills via the Skill tool's `available_skills` list in the tool definition.
