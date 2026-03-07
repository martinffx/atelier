---
name: atelier-spec-research
description: Systematic research and exploration before planning. Use when exploring new domains, understanding existing code, gathering technical context, or preparing for feature design.
user-invocable: false
---

# Research Skill

Systematic research and exploration before planning. Gather technical context, understand existing code, and explore new domains before creating a plan.

## Overview

Research happens AFTER problem understanding (product skill) but BEFORE solution design (architect skill). It fills the gap between "what we want to build" and "how we'll build it."

```
Product Discovery → Research → Architect Design → Implementation
     "What?"          "How?"         "Build this"
```

## Research Checklist

Before creating a plan, verify you've explored:

- [ ] **Existing Codebase**: What already exists that we can build on?
- [ ] **Similar Implementations**: Are there patterns in the codebase we can follow?
- [ ] **Technical Constraints**: What are the limits of our current stack?
- [ ] **Dependencies**: What libraries, APIs, or services will we need?
- [ ] **Risks**: What are the unknown unknowns?
- [ ] **Context**: What's the current architecture and design decisions?

## Process Flow

```
Start: Have a feature/change to make
  ↓
Understand what exists → Read existing code, docs, specs
  ↓
Identify what's similar → Find patterns, examples, prior art
  ↓
Assess constraints → Stack limits, dependencies, integration points
  ↓
Document risks → What's uncertain? What's complex?
  ↓
Synthesize findings → Summary for architect
  ↓
End: Ready for design
```

## Output: Research Summary

A research summary should provide enough context for the architect to make informed decisions:

```markdown
## Research Summary

### What Exists
- [List existing components, patterns, code that applies]

### What's Similar
- [Examples from codebase that inform this work]

### Constraints
- [Technical limitations, dependencies, integration points]

### Risks
- [Unknowns, complexities, potential issues]

### Recommendations
- [Suggested approach based on research]
```

## Key Principles

- **Before planning** - Research first, then design
- **Understand before deciding** - Don't assume you know the codebase
- **Document what you learn** - Research is only useful if shared
- **Identify risks early** - Better to surface unknowns than be surprised

## When Research Is Complete

Research is complete when you can answer:
- What existing code does this interact with?
- What patterns exist that we should follow?
- What are the technical constraints?
- What are the main risks?
- Is this feasible given our current architecture?

If you can't answer these questions, you need more research.

## Integration

**Called by:**
- Product skill (before architect handoff)
- Architect skill (before design)
- Any skill needing technical context

**Feeds into:**
- Architect skill (for informed design decisions)
- Planning skill (for realistic task estimation)
