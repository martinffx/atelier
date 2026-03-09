---
name: code:debug
description: >
  Systematic debugging workflow and techniques. Use when something is broken, not working as
  expected, or throwing errors. Covers reproduction, isolation, hypothesis formation, fix
  implementation, and verification. Also triggers on "why does X fail", "debug this", "this
  is broken", or when encountering errors or unexpected behavior.
user-invocable: true
---

# Code Debug

Systematic debugging workflow to find and fix bugs efficiently. Never guess — always
narrow down the problem through systematic elimination.

## The Debugging Mindset

| Bad | Good |
|-----|------|
| "I think it's..." | "Let me verify..." |
| Changing random things | Binary search narrowing |
| Hoping it'll work | Verifying each hypothesis |
| Moving on after it works | Adding regression test |

## The Five-Step Workflow

### Step 1: Reproduce

Create the smallest possible reproduction case.

**Questions to answer:**
- What exactly triggers the bug?
- Can I make it happen on demand?
- What's the minimal input that causes it?

**Techniques:**
- Extract exact steps from bug report
- Remove unrelated factors
- Create a minimal test case

**Output:** "I can reproduce the bug by [exact steps]."

---

### Step 2: Isolate

Narrow down where the bug lives using binary search.

**Binary search strategies:**
- Comment out half the code → does it still fail?
- Isolate by layer: is it the UI, service, or data layer?
- Isolate by file: which file contains the bug?
- Isolate by function: which function causes the issue?

**Git bisect** (for regression bugs):
```bash
git bisect start
git bisect bad  # current commit is broken
git bisect good <last-working-commit>
# Run tests, mark good/bad
git bisect reset  # done
```

**Output:** "The bug is in [specific file/function/component]."

---

### Step 3: Form Hypothesis

Make a testable guess about the root cause.

**Good hypothesis:**
- Specific: "The user ID is undefined because..."
- Testable: Can verify with a test or log
- Grounded: Based on evidence, not guess

**Questions to ask:**
- Why does this happen?
- What are the preconditions?
- What's the actual vs expected behavior?
- What changed recently?

**Output:** "I hypothesize that [root cause] because [evidence]."

---

### Step 4: Fix

Implement the fix based on your hypothesis.

**Rules:**
- Make minimal changes
- Don't refactor while fixing (separate concerns)
- Write failing test first if possible
- Consider edge cases

**Fix patterns:**
- **Missing value** → Add null check or default
- **Wrong value** → Correct the logic
- **Exception** → Handle the error case
- **Logic error** → Fix the condition

**Output:** "Fix applied: [brief description]."

---

### Step 5: Verify

Confirm the fix works and doesn't break anything.

**Verification steps:**
1. Run the reproduction case → should pass now
2. Run related tests → should pass
3. Run full test suite → should pass
4. Add regression test → prevents future breakage

**Output:** "Fix verified. Tests passing. Regression test added."

---

## Debugging Techniques

### Print Debugging

Quick and dirty, but sometimes the fastest way.

**When to use:**
- Quick checks in development
- When debugger isn't available
- Understanding flow in unfamiliar code

**Best practices:**
- Print at entry/exit of functions
- Print variable values at key points
- Remove print statements before committing
- Consider structured logging instead

### Debugger

More powerful than print debugging.

**When to use:**
- Complex state to inspect
- Stepping through logic
- Evaluating expressions in context

**See references/language-tools.md for language-specific debugger commands.**

### Logging

Better than print for production issues.

**Strategies:**
- Add context: request ID, user ID, correlation IDs
- Log at appropriate levels: DEBUG, INFO, WARN, ERROR
- Don't log sensitive data
- Structured logging (JSON) for easier parsing

**See references/techniques.md for logging patterns.**

### Binary Search

Halving the search space.

**Strategies:**
- Comment out code blocks
- Test with half the data
- Compare working vs broken configurations
- Git bisect for regressions

### Rubber Ducking

Explain the problem out loud (or to a rubber duck).

**Process:**
1. Describe the problem in detail
2. Explain what you expect to happen
3. Explain what's actually happening
4. Often the solution becomes clear mid-explanation

---

## Common Bug Patterns

### Null/Undefined Errors

**Symptoms:** Cannot read property X of undefined

**Debug approach:**
1. Find where the value becomes undefined
2. Trace back where it should come from
3. Add guard or fix source

**Fix patterns:**
```javascript
// Before
const name = user.profile.name;

// After
const name = user?.profile?.name ?? 'Unknown';
// or
if (!user?.profile) return;
const name = user.profile.name;
```

### Race Conditions

**Symptoms:** Intermittent failures, flaky tests

**Debug approach:**
1. Identify async operations
2. Find timing dependencies
3. Add delays or force ordering

**Fix patterns:**
- Use async/await properly
- Add proper synchronization
- Consider immutable state

### Logic Errors

**Symptoms:** Wrong output, wrong behavior

**Debug approach:**
1. Trace through the logic manually
2. Compare expected vs actual at each step
3. Find the first step that diverges

**Fix patterns:**
- Fix the condition
- Correct the calculation
- Update the state correctly

### Performance Issues

**Symptoms:** Slow, memory leaks, timeouts

**Debug approach:**
1. Measure first (don't guess)
2. Identify hot paths
3. Optimize the bottleneck

**See code:perf skill for detailed performance debugging.**

---

## Skill Loading

Check available skills for additional debugging support:

- If dealing with performance issues → load code:perf
- If security vulnerability suspected → load code:security
- If debugging tests → load oracle:testing

---

## Output Format

After each debugging session, summarize:

```
## Debug Summary

**Problem:** [One sentence]
**Root Cause:** [What actually was wrong]
**Fix:** [How you fixed it]
**Verification:** [Test results]
**Prevention:** [Regression test added?]
```

This helps future-you understand what happened.
