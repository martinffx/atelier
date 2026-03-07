# Superpowers Integration into Atelier - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use atelier-spec-parallel-execution to implement this plan task-by-task.

**Goal:** Enhance atelier collection with superpowers workflow patterns while maintaining domain-specific focus and domain boundary testing philosophy

**Architecture:** Enhance existing skills with hard gates, create new skills for missing workflow pieces, update methodology to document integration

**Tech Stack:** Markdown skills with YAML frontmatter, following existing atelier conventions

**Key Principle:** Domain Boundary TDD - test at boundaries, mock at boundaries, implement from boundaries

---

## Research Summary

### Project Context
- **Repository:** Claude Code Atelier - marketplace of skills and plugins
- **Current State:** 24 skills across 4 domains (spec, oracle, typescript, python)
- **Recent Activity:** Refactoring for consistent naming (atelier-* prefix)

### Existing Patterns
- **Skill Structure:** `skills/atelier-{domain}-{topic}/SKILL.md` + optional `references/`
- **Naming:** `atelier-{domain}-{topic}` (domains: spec, oracle, typescript, python)
- **YAML Frontmatter:** name, description ("Use when..."), user-invocable
- **Auto-invocation:** Skills loaded based on description match

### Integration Points
- OpenCode: Skills via `skill` tool
- Claude Code: Plugins via `/plugin` commands
- Beads: Task tracking with dependency ordering
- OpenSpec: Living specifications in `docs/spec/`

### Dependencies
- Superpowers skills: `~/.config/opencode/skills/superpowers/` (14 skills)
- Need adaptation, not direct copying
- Must maintain domain boundary testing philosophy

### Gap Analysis
**Missing Skills:** using-atelier, research, planning, parallel-execution, verification
**Skills Needing Enhancement:** product, architect, testing, challenge, methodology

---

## Task Breakdown

### Task 1: Create Meta Skill

**Files:**
- Create: `skills/atelier-spec-using-atelier/SKILL.md`

**Description:** Meta-skill governing when and how to invoke atelier skills

**Implementation:**
1. Create directory: `skills/atelier-spec-using-atelier/`
2. Create `SKILL.md` with:
   - YAML frontmatter: name, description, user-invocable: false
   - Overview: "Invoke relevant skills BEFORE any response or action"
   - The Rule section with flow diagram
   - Red Flags table (rationalization patterns)
   - Skill Priority section (process skills first)
   - Skill Types section (rigid vs flexible)
   - Tool Mapping for OpenCode
   - Skills location reference

**Verification:**
- YAML frontmatter valid
- Description matches pattern: "Use when..."
- Flow diagram renders correctly
- All sections present

**Commit:** `feat: add using-atelier meta skill for skill invocation governance`

---

### Task 2: Enhance Product Discovery

**Files:**
- Modify: `skills/atelier-spec-product/SKILL.md`

**Description:** Add brainstorming patterns and hard gates

**Implementation:**
1. Add HARD-GATE section after "Product Skill" heading
2. Add Anti-Pattern section: "This Is Too Simple To Need A Design"
3. Replace "Discovery Interview" with Checklist (6 items)
4. Add Process Flow diagram
5. Add Key Principles section

**Verification:**
- HARD-GATE prominent
- Checklist replaces Discovery Interview
- Process flow renders
- Key Principles added

**Commit:** `feat: enhance product discovery with brainstorming patterns and hard gates`

---

### Task 3: Enhance Planning

**Files:**
- Modify: `skills/atelier-spec-architect/SKILL.md`

**Description:** Add planning patterns and execution handoff

**Implementation:**
1. Add Bite-Sized Task Granularity section (2-5 min steps)
2. Add Plan Document Header section with template
3. Add Task Structure Template (mention domain boundaries)
4. Add Execution Handoff section (subagent vs parallel)
5. Add Remember section (mention domain boundaries)

**Verification:**
- Bite-Sized section added
- Plan Document Header template present
- Task Structure mentions domain boundaries
- Execution Handoff clear
- Remember mentions domain boundaries

**Commit:** `feat: enhance architect with planning patterns and execution handoff`

---

### Task 4: Enhance Testing

**Files:**
- Modify: `skills/atelier-spec-testing/SKILL.md`

**Description:** Add domain boundary TDD patterns and iron law

**Implementation:**
1. Add The Iron Law: "NO PRODUCTION CODE WITHOUT A FAILING TEST"
2. Replace "Core Principle: Stub-Driven TDD" with Domain Boundary TDD
3. Add Mocking Philosophy section with table
4. Update Layer Boundary Testing with clarification
5. Add Verification Checklist (adapted to boundaries)
6. Add Red Flags (mention domain boundaries)
7. Add When Stuck (adapted to boundaries)

**Verification:**
- Iron Law prominent
- Domain Boundary TDD present
- Mocking Philosophy table correct
- Layer Boundary Testing clarified
- Verification Checklist adapted
- Red Flags mention boundaries
- When Stuck adapted

**Commit:** `feat: enhance testing with domain boundary TDD, iron law, and verification checklist`

---

### Task 5: Enhance Debugging

**Files:**
- Modify: `skills/atelier-oracle-challenge/SKILL.md`

**Description:** Add systematic debugging phases and iron law

**Implementation:**
1. Add The Iron Law: "NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST"
2. Add When to Use section
3. Add The Four Phases (Root Cause, Pattern, Hypothesis, Implementation)
4. Add Red Flags section
5. Add Common Rationalizations section
6. Add Quick Reference section

**Verification:**
- Iron Law prominent
- Four Phases complete
- Phase 4 mentions domain boundary testing
- Red Flags present
- Common Rationalizations formatted
- Quick Reference present

**Commit:** `feat: enhance debugging with systematic phases, iron law, and rationalization prevention`

---

### Task 6: Create Research Skill

**Files:**
- Create: `skills/atelier-spec-research/SKILL.md`
- Create: `skills/atelier-spec-research/references/research-checklist.md`

**Description:** Systematic research and exploration before planning

**Implementation:**
1. Create directory: `skills/atelier-spec-research/`
2. Create `SKILL.md` with:
   - YAML frontmatter: name, description, user-invocable: false
   - Overview: "Systematic research and exploration before planning"
   - Checklist (6 items)
   - Process Flow diagram
   - Output section: Research summary format
   - Key Principles section
3. Create `references/research-checklist.md` with checklists

**Verification:**
- YAML frontmatter valid
- Description matches pattern
- Process flow renders
- Reference file exists

**Commit:** `feat: add research skill for systematic exploration before planning`

---

### Task 7: Create Planning Skill

**Files:**
- Create: `skills/atelier-spec-planning/SKILL.md`
- Create: `skills/atelier-spec-planning/references/plan-template.md`

**Description:** Create implementation plans with bite-sized tasks

**Implementation:**
1. Create directory: `skills/atelier-spec-planning/`
2. Create `SKILL.md` with:
   - YAML frontmatter: name, description, user-invocable: false
   - Overview: "Create implementation plans with bite-sized tasks"
   - Plan Document Header section
   - Task Structure Template (mention domain boundaries)
   - Execution Handoff section
   - Remember section (mention domain boundaries)
3. Create `references/plan-template.md` with templates

**Verification:**
- YAML frontmatter valid
- All sections present
- Templates mention domain boundaries
- Reference file exists

**Commit:** `feat: add planning skill for creating implementation plans with bite-sized tasks`

---

### Task 8: Create Parallel Execution Skill

**Files:**
- Create: `skills/atelier-spec-parallel-execution/SKILL.md`

**Description:** Execute plans with parallel agents

**Implementation:**
1. Create directory: `skills/atelier-spec-parallel-execution/`
2. Create `SKILL.md` with:
   - YAML frontmatter: name, description, user-invocable: false
   - Overview: "Execute plans with parallel agents"
   - The Process (5 steps)
   - When to Stop section
   - When to Revisit section
   - Remember section (mention domain boundaries)
   - Integration section

**Verification:**
- YAML frontmatter valid
- Process steps clear
- Stop conditions defined
- Integration with OpenCode mentioned

**Commit:** `feat: add parallel execution skill for dispatching parallel agents`

---

### Task 9: Create Verification Skill

**Files:**
- Create: `skills/atelier-spec-verification/SKILL.md`
- Create: `skills/atelier-spec-verification/references/verification-commands.md`

**Description:** Evidence-based verification before completion claims

**Implementation:**
1. Create directory: `skills/atelier-spec-verification/`
2. Create `SKILL.md` with:
   - YAML frontmatter: name, description, user-invocable: false
   - Overview: "Evidence-based verification before completion claims"
   - The Iron Law section
   - The Gate Function (5 steps)
   - Common Failures table
   - Red Flags section
   - Rationalization Prevention table
   - Key Patterns section
   - Why This Matters section
   - When To Apply section
3. Create `references/verification-commands.md` with commands

**Verification:**
- YAML frontmatter valid
- Iron Law prominent
- Gate Function clear
- Tables formatted
- Reference file exists

**Commit:** `feat: add verification skill for evidence-based completion claims`

---

### Task 10: Update Methodology

**Files:**
- Modify: `skills/atelier-spec-methodology/SKILL.md`

**Description:** Document superpowers integration and domain boundary testing

**Implementation:**
1. Add Superpowers Integration section
2. Update Workflow Phases table (add testing phase)
3. Add Skill Invocation Flow section with diagram
4. Add Hard Gates section with table
5. Add Red Flags section with table
6. Add Verification Requirements section with table
7. Add Domain Boundary Testing section

**Verification:**
- Superpowers Integration added
- Workflow Phases updated
- Skill Invocation Flow renders
- Hard Gates table complete
- Red Flags table present
- Verification Requirements present
- Domain Boundary Testing added

**Commit:** `feat: update methodology with superpowers integration, hard gates, verification, and domain boundary testing`

---

## Implementation Order

**Dependency-based:**
1. Task 1 (Meta skill) - Foundation
2. Task 2 (Enhance product) - Builds on current
3. Task 3 (Enhance planning) - Builds on current
4. Task 4 (Enhance testing) - Builds on current, domain boundary philosophy
5. Task 5 (Enhance debugging) - Builds on current
6. Task 10 (Update methodology) - Documents integration
7. Task 6 (Create research) - Missing piece
8. Task 7 (Create planning) - Missing piece
9. Task 8 (Create parallel execution) - Missing piece
10. Task 9 (Create verification) - Missing piece

---

## Key Principles

1. **Domain-specific focus** - Keep atelier's technical depth
2. **Process rigor** - Add superpowers' hard gates and verification
3. **Living specs** - Maintain OpenSpec and Beads integration
4. **Layered architecture** - Keep functional core/effectful edge
5. **Evidence-based** - Add verification-before-completion
6. **Domain boundary testing** - Test at boundaries, mock at boundaries

---

## Execution Options

**1. Subagent-Driven (this session)** - Dispatch fresh subagent per task, review between tasks

**2. Parallel Session (separate)** - Open new session with atelier-spec-parallel-execution, batch execution
