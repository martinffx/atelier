---
name: code:review
description: Comprehensive code review for quality, security, performance, and architecture. Use whenever the user asks to review code, wants feedback on their implementation, asks for a code review, or mentions reviewing files, diffs, or code quality. Triggers on phrases like "review this", "look at this code", "what do you think of", "check for bugs", "check for security", "refactor", or when the user shares code snippets, git diffs, or file paths wanting analysis.
user-invocable: true
---

# Code Review Skill

Comprehensive code analysis covering quality, security, performance, and architecture.

## Skill Loading

Before reviewing, check what skills are available that could be relevant to the code being reviewed. If there's a skill that covers the language, framework, or pattern being used — load it. Don't skip this step "because you think you don't need it."

### When to Load

- Any framework or library detected in imports (Fastify, Drizzle, SQLAlchemy, Express, etc.)
- Architecture or design pattern questions
- Testing patterns and approaches
- Build tools or tooling concerns

### How to Load

1. List available skills to see what's installed
2. Identify which ones are relevant to the code being reviewed
3. Load ALL relevant skills before starting the detailed review
4. Apply the loaded skill's patterns, conventions, and best practices in your review

The goal is to give contextual, convention-aware feedback — not generic advice. If a skill exists for it, use it.

## Input Methods

Support multiple ways to provide code for review:

### 1. File/Directory Review
When user specifies files or directories to review:
- Read all relevant files in the specified path(s)
- For directories, prioritize source files (`.ts`, `.js`, `.py`, `.go`, `.rs`, etc.)
- Skip build artifacts, node_modules, `.git`, and other generated content

### 2. Git Diff Review
When user mentions git changes, diffs, or commits:
- Run `git diff` for uncommitted changes
- Or `git diff <commit>` for specific commits
- Or `git diff main..branch` for branch comparisons
- Analyze what changed and why

### 3. Pasted Code Review
When user pastes code directly:
- Analyze the provided code snippet
- Ask for context if code depends on imports not provided
- Focus on the specific code provided

## Review Framework

For every review, analyze these four dimensions:

### 1. Code Quality

**Readability:**
- Clear variable/function names
- Appropriate comment usage (explain why, not what)
- Consistent formatting and style
- Logical code organization

**Maintainability:**
- DRY principles (avoid duplication)
- Single Responsibility per function/module
- Low coupling between components
- Appropriate abstraction levels

**Best Practices:**
- Error handling completeness
- Type safety (TypeScript types, Python type hints)
- Resource cleanup (connections, files, handlers)
- Configuration management

### 2. Security

**OWASP Top 10 Awareness:**
- Injection attacks (SQL, command, XSS)
- Authentication/authorization issues
- Sensitive data exposure
- Deserialization vulnerabilities
- Using components with known vulnerabilities

**Common Patterns to Check:**
```python
# BAD - SQL injection risk
query = f"SELECT * FROM users WHERE id = {user_id}"

# GOOD - Parameterized query
query = "SELECT * FROM users WHERE id = $1"
```

```javascript
// BAD - XSS vulnerability
dangerouslySetInnerHTML={{ __html: userInput }}

// GOOD - Sanitize or use text content
<div>{sanitize(userInput)}</div>
```

**Secrets Management:**
- No hardcoded passwords, API keys, tokens
- Environment variables for sensitive config
- Proper .gitignore for secret files

### 3. Performance

**Algorithmic Complexity:**
- Identify O(n²) or worse patterns
- Suggest indexed lookups vs full scans
- Consider caching for repeated operations

**Resource Management:**
- Database query efficiency (N+1 problems)
- Memory leaks (unclosed resources, growing caches)
- Connection pooling
- Lazy loading vs eager loading

**Example Issues:**
```python
# BAD - N+1 query problem
for user in users:
    print(user.get_profile().name)  # Each call = DB query

# GOOD - Eager load or batch
profiles = ProfileService.get_many([u.id for u in users])
```

### 4. Architecture

**Design Patterns:**
- Appropriate use of patterns for the language/framework
- Consistency with codebase conventions
- SOLID principles

**Layer Separation:**
- Business logic separated from infrastructure
- Clear boundaries between components
- Dependency direction points to abstractions, not concretions

**Error Handling Strategy:**
- Consistent error types
- Proper error propagation
- User-friendly error messages vs technical details

## Output Format

Always present findings in this structured format:

```
# Code Review: [filename/module]

## Summary
[2-3 sentence overview of what this code does and overall quality]

## Findings

### Critical (Fix before merge)
- **Issue:** [Description]
- **Location:** [File:line or function name]
- **Impact:** [Why this matters]
- **Suggestion:** [How to fix]

### High Priority (Should address)
[Same structure]

### Medium Priority (Nice to have)
[Same structure]

### Low Priority (Future consideration)
[Same structure]

### Positive Findings
- What the code does well
- Smart patterns worth keeping
- Good practices to propagate

## Recommendations
- Priority-ordered list of actionable improvements
- Links to relevant docs or patterns if helpful
```

## Severity Guidelines

| Severity | When to use |
|----------|-------------|
| Critical | Security vulnerability, data loss risk, crash possible |
| High | Bug causing wrong behavior, significant performance issue |
| Medium | Code smell, maintainability issue, minor bug |
| Low | Style preference, optional improvement, educational |

## Interaction Patterns

### Clarifying Questions
If context is missing, ask:
- "What's the expected behavior?" (when behavior is unclear)
- "What framework/language version?" (when it affects recommendations)
- "Are there specific concerns?" (when user has particular worries)

### Follow-up Actions
After initial review, offer to:
- Fix specific issues identified
- Write tests for edge cases
- Refactor problematic sections
- Explain any finding in more detail

## Language-Specific Notes

**TypeScript/JavaScript:**
- Check async/await error handling
- Verify null/undefined handling
- Look for proper typing

**Python:**
- Check exception handling specificity
- Verify type hints usage
- Look for proper async patterns

**Go:**
- Check error handling (no ignore errors)
- Verify goroutine leak prevention
- Look for context usage

**Rust:**
- Check Result/Option handling
- Verify lifetimes if complex
- Look for proper error propagation
