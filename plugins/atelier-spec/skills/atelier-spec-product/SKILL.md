---
name: product
description: Requirements discovery and scope definition. Use when gathering requirements, conducting discovery interviews, defining scope boundaries, or prioritizing features.
user-invocable: false
---

# Product Skill

Product requirements discovery and scope definition for feature specifications.

## Discovery Interview

Use open-ended questions to explore the problem space and understand user needs:

### Problem Understanding
- What problem are we trying to solve?
- Who experiences this problem?
- How do they currently solve it?
- What triggers the need for this solution?
- What does success look like?

### User Needs
- What are the core user jobs to be done?
- What pain points exist in the current workflow?
- What outcomes do users expect?
- What constraints or limitations exist?
- What assumptions are we making?

### Context Discovery
- What existing systems/features does this integrate with?
- What data do we need access to?
- What business rules or regulations apply?
- What are the technical constraints?
- What are the performance requirements?

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
