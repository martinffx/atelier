---
name: atelier-spec-product
description: Requirements discovery and scope definition. Use when gathering requirements, conducting discovery interviews, defining scope boundaries, or prioritizing features.
user-invocable: false
---

# Product Skill

> ## HARD-GATE
> **You MUST load this skill BEFORE gathering requirements**
>
> Skipping product discovery leads to:
> - **Over-building**: Solving problems that don't exist or don't matter
> - **Under-building**: Missing critical functionality users actually need
> - **Rework**: Building the wrong thing twice

Product requirements discovery and scope definition for feature specifications.

## Anti-Patterns

### This Is Too Simple To Need A Design

**The Rationalization:**
> "We know what this is. It's straightforward - just a simple feature. We don't need to waste time on discovery."

**Why It's Dangerous:**
- Every "simple" feature has hidden assumptions about user intent, data shape, and edge cases
- What seems obvious is often based on incomplete understanding
- The cost of rework multiplies with each layer built on shaky foundations

**Example of Rework:**
> Team skips discovery, builds a "simple" notification feature. Later discovers:
> - Users needed batch digest, not real-time alerts
> - Different user roles required different notification channels
> - Regulatory requirements meant audit logs were mandatory
>
> Result: 3x implementation time, angry users, compliance risks.

## Discovery Checklist

Use this 6-item checklist to validate your understanding before proceeding to design:

- [ ] **Problem Validated** - Confirmed the problem exists, matters, and affects enough users to justify work
- [ ] **Users Identified** - Know who experiences the problem, their roles, and constraints
- [ ] **Current Solution Analyzed** - Understood how users solve this problem today (manual workarounds, competitors, etc.)
- [ ] **Success Criteria Defined** - Clear, measurable outcomes that indicate the feature works
- [ ] **Scope Boundaries Set** - Explicitly defined what is IN and OUT of scope
- [ ] **Integration Points Known** - Identified systems, data, and dependencies this feature connects to

## Process Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DISCOVERY WORKFLOW                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │   START     │───▶│  VALIDATE   │───▶│  IDENTIFY   │             │
│  │  Context    │    │   Problem   │    │   Users     │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│                                              │                     │
│                                              ▼                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │   DEFINE    │◀───│   DEFINE    │◀───│   ANALYZE   │             │
│  │   Scope     │    │   Success   │    │   Current   │             │
│  │ Boundaries  │    │   Criteria  │    │   Solution  │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│                                              │                     │
│                                              ▼                     │
│                                        ┌─────────────┐             │
│                                        │    END      │             │
│                                        │   Ready for │             │
│                                        │   Design    │             │
│                                        └─────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Principles

- **No assumptions without validation** - Every assumption must be tested, not accepted as truth
- **No feature without problem** - Every piece of functionality must trace back to a validated user problem
- **No scope without tradeoffs** - Every boundary decision has costs; explicit tradeoffs prevent hidden complexity

## Scope Definition

Define clear boundaries for the feature:

### In Scope
- Core functionality that delivers the primary value
- Critical user journeys that must be supported
- Essential integrations required for MVP
- Minimum viable data model
- Must-have business rules

### Out of Scope
- Nice-to-have features deferred to later
- Advanced use cases for future iterations
- Optional integrations
- Performance optimizations beyond basic requirements
- Edge cases that can be handled manually

### MVP Criteria
- What is the minimum viable feature that delivers value?
- What can users accomplish with the MVP?
- What assumptions need validation?
- What can be learned and iterated on?

## User Story Extraction

Convert discovery insights into actionable user stories:

### Story Format
```
As a [role]
I want to [action]
So that [benefit]
```

### Acceptance Criteria
- Given [context]
- When [action]
- Then [expected outcome]

### Examples
```
As a project manager
I want to view task dependencies
So that I can identify blockers

Acceptance Criteria:
- Given tasks with dependencies
- When viewing a task
- Then I see all blocking and blocked tasks
```

### Story Decomposition
- Break large stories into smaller, implementable pieces
- Ensure each story delivers independent value
- Order stories by dependency and risk
- Identify stories that validate assumptions

## Prioritization Matrix

### Value vs Effort
- **High Value, Low Effort** → Do first (quick wins)
- **High Value, High Effort** → Do second (core features)
- **Low Value, Low Effort** → Do later (polish)
- **Low Value, High Effort** → Don't do (avoid waste)

### Dependencies
- Technical dependencies (database before API)
- Business dependencies (auth before user features)
- Learning dependencies (experiments before commitments)
- External dependencies (third-party integrations)

### MoSCoW Framework
- **Must Have** - Core value, MVP blockers
- **Should Have** - Important but not critical
- **Could Have** - Nice to have if time permits
- **Won't Have** - Explicitly deferred

### Risk-Based Prioritization
- Tackle high-risk assumptions early
- Validate technical feasibility first
- Test user adoption hypotheses
- Front-load learning and discovery

## Handoff to Architect

Product outputs that feed into technical design:

### Business Context
- Problem statement and user needs
- Key user journeys and workflows
- Business rules and constraints
- Success metrics and acceptance criteria

### Scope and Priorities
- In/out scope boundaries
- MVP definition
- Story breakdown with priorities
- Feature dependencies

### Data Requirements
- What data entities are involved
- What relationships exist between entities
- What operations users need to perform
- What access patterns are expected

### Integration Points
- External systems to integrate with
- Events to publish or consume
- APIs to call or expose
- Data sources to read or write

### Non-Functional Requirements
- Performance expectations (latency, throughput)
- Security requirements (auth, authorization, data protection)
- Scalability needs (user growth, data volume)
- Reliability targets (uptime, error rates)

## Product → Architect Flow

```
Product Skill Outputs         →    Architect Skill Inputs
─────────────────────────────────────────────────────────
Problem & User Needs          →    Domain Model Design
User Stories & Acceptance     →    Component Responsibilities
Data Requirements             →    Entity & Schema Design
Integration Points            →    API & Event Design
Priorities & Dependencies     →    Task Breakdown & Ordering
```

The architect uses product context to make informed technical decisions:
- Domain models reflect real user workflows
- Component boundaries align with business capabilities
- Data models support actual access patterns
- API contracts satisfy user story acceptance criteria
- Implementation order respects business priorities
