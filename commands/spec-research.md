# Spec Research: $ARGUMENTS

Purpose: Discovery, research, and architecture → produces spec.md

## Prerequisites

None - this can be the first step in a new feature

## Steps

### Step 1: Discovery

@oracle conduct discovery interview for $ARGUMENTS

Ask questions one at a time:
- What problem are we solving?
- Who are the users?
- What does success look like?
- What constraints exist?

Store answers for spec creation.

### Step 2: Research

Read existing codebase to understand:
- Check for related features in docs/spec/
- Understand current patterns and conventions
- Identify integration points
- Review relevant code sections

### Step 3: Design

@architect design architecture for $ARGUMENTS

Design:
- Data models and entities
- Services and repositories
- API endpoints
- Database schema (if applicable)
- Dependencies between components

### Step 4: Create Spec

@clerk create docs/spec/{feature}/spec.md

Write spec.md with:
- Requirements section (from oracle discovery)
- Technical Design section (from architect)
- Include user stories, acceptance criteria, business rules

### Step 5: Review

Present spec.md to human for approval.

**Say:** "spec.md is complete. Ready for your review before we proceed to planning."

## Output

- Created: `docs/spec/{feature}/spec.md`

## Next Step

After human approval: `/spec:plan {feature}`
