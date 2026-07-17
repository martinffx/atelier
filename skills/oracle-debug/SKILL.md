---
name: oracle-debug
description: >
  Disciplined debugging methodology. Triggers on bug reports, test failures, "debug this",
  "diagnose this", unexpected behavior, build failures, integration issues, or performance
  regressions. Always find root cause before attempting any fix.
user-invocable: true
---

# Oracle Debug

Random fixes waste time and create new bugs. Quick patches mask underlying issues.

**Core principle:** find root cause before attempting any fix. Symptom fixes are failure.

**Violating the letter of this process is violating the spirit of debugging.**

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## When to Use

Use for any technical issue:

- Test failures
- Bugs in production
- Unexpected behavior
- Performance regressions
- Build or integration failures
- Intermittent failures

**Use this especially when:**

- Under time pressure
- "Just one quick fix" seems obvious
- You've already tried multiple fixes
- The previous fix didn't work
- You don't fully understand the issue

## The Four Phases

You must complete each phase before proceeding to the next.

---

## Phase 1 — Root Cause Investigation

**Before attempting any fix:**

Use the project's domain glossary and ADRs to build a clear mental model of the
relevant modules before tracing.

1. **Read error messages carefully.** Read the full stack trace, line numbers, file paths, and error codes. Don't skip warnings.
2. **Build a fast feedback loop.** If you don't have a fast, deterministic, pass/fail signal for the bug, no amount of code-reading will save you. Spend disproportionate effort here.

   Try these in order:
   - Failing test at the seam that reaches the bug
   - Curl / HTTP script against a running dev server
   - CLI invocation with fixture input
   - Headless browser script (Playwright/Puppeteer)
   - Replay a captured trace (network payload, event log)
   - Throwaway harness (minimal subset of the system)
   - Property/fuzz loop for "sometimes wrong" bugs
   - Bisection harness (e.g., `git bisect run`)
   - Differential loop (old vs new version)
   - HITL bash script (last resort — structure the human clicks)

   Iterate on the loop: make it faster, sharper, and more deterministic. A 30-second flaky loop is barely better than no loop.

3. **Reproduce the bug.** Run the loop. Confirm the failure matches what the user described, is reproducible across runs, and the exact symptom is captured.
4. **Check recent changes.** `git diff`, recent commits, new dependencies, config changes, environment differences.
5. **Trace data flow.** In multi-component systems, add diagnostic instrumentation at each boundary:
   - Log what data enters each component
   - Log what data exits each component
   - Verify environment/config propagation
   - Check state at each layer

   Run once to gather evidence, then narrow to the failing component.
6. **Trace backward through the call stack.** Where does the bad value originate? What called this with the bad value? Trace up until you find the source. Fix at the source, not at the symptom.

### Non-deterministic bugs

The goal is not a clean repro but a **higher reproduction rate**. Loop the trigger 100×, parallelize, add stress, narrow timing windows, inject sleeps. A 50% flake is debuggable; 1% is not — keep raising the rate until it is.

### When you genuinely cannot build a loop

Stop and say so explicitly. Ask the user for:

- Access to the environment that reproduces it
- A captured artifact (HAR, log dump, core dump, screen recording)
- Permission to add temporary production instrumentation

**Do not proceed to Phase 2 without a loop you believe in.**

---

## Phase 2 — Pattern Analysis

Find the pattern before fixing.

1. **Find working examples.** Locate similar working code in the same codebase.
2. **Compare against references.** If implementing a known pattern, read the reference implementation completely.
3. **Identify differences.** List every difference between working and broken, however small.
4. **Understand dependencies.** What components, config, settings, and assumptions does this code rely on?

---

## Phase 3 — Hypothesis and Testing

Use the scientific method.

1. **Generate 3–5 ranked hypotheses.** Single-hypothesis generation anchors on the first plausible idea. Each hypothesis must be falsifiable: state the prediction it makes. **Show the ranked list to the user before testing** — they often have domain knowledge that re-ranks instantly.

   > Format: "If `<X>` is the cause, then `<changing Y>` will make the bug disappear / `<changing Z>` will make it worse."

2. **Test one variable at a time.** Make the smallest possible change to test the hypothesis.
3. **Instrument mapped to predictions.** Each probe must map to a specific prediction. Prefer a debugger/REPL over logs; prefer targeted logs at boundaries over "log everything and grep".

   **Tag every debug log** with a unique prefix, e.g. `[DEBUG-a4f2]`. Cleanup becomes a single grep.

4. **Performance regressions.** Logs are usually wrong. Establish a baseline measurement (timing harness, profiler, query plan), then bisect. Measure first, fix second.

5. **When you don't know, say so.** Don't pretend. Ask for help or research more.

---

## Phase 4 — Implementation

Fix the root cause, not the symptom.

1. **Create a failing test case.** The simplest possible reproduction. MUST exist before the fix.

   A **correct seam** is one where the test exercises the real bug pattern as it occurs at the call site. If the only available seam is too shallow, note that the codebase architecture is preventing the bug from being locked down.

2. **Implement a single fix.** Address the root cause. One change at a time. No "while I'm here" improvements. No bundled refactoring.
3. **Verify the fix.** Does the test pass? Do other tests still pass? Does the original repro no longer reproduce?
4. **If the fix doesn't work:**
   - STOP
   - Count the failed fix attempts
   - If < 3: return to Phase 1 with the new information
   - If ≥ 3: **question the architecture**. Pattern problems, hidden coupling, and shared state that each fix reveals are signs of a wrong pattern. Discuss with the user before attempting Fix #4.

### Cleanup + post-mortem

Before declaring done:

- [ ] Original repro no longer reproduces (re-run Phase 1 loop)
- [ ] Regression test passes (or absence of seam is documented)
- [ ] All `[DEBUG-...]` instrumentation removed
- [ ] Throwaway prototypes deleted or moved to a clearly-marked debug location
- [ ] The correct hypothesis is stated in the commit / PR message
- [ ] You asked: "What would have prevented this bug?"

---

## Red Flags — Stop and Return to Phase 1

If you catch yourself thinking:

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip the test, I'll manually verify"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "Pattern says X but I'll adapt it differently"
- "One more fix attempt" (after 2+ failures)
- Each fix reveals a new problem in a different place

All of these mean: stop. Return to Phase 1.

## Common Rationalizations

| Excuse | Reality |
|---|---|
| "Issue is simple, don't need process" | Simple issues have root causes too. |
| "Emergency, no time for process" | Systematic debugging is faster than thrashing. |
| "Just try this first, then investigate" | First fix sets the pattern. Do it right from the start. |
| "I'll write the test after confirming the fix" | Untested fixes don't stick. Test first proves the bug. |
| "Multiple fixes at once saves time" | Can't isolate what worked. Causes new bugs. |
| "Reference too long, I'll adapt the pattern" | Partial understanding guarantees bugs. |
| "I see the problem, let me fix it" | Seeing symptoms ≠ understanding root cause. |

## Quick Reference

| Phase | Key Activities | Success Criteria |
|---|---|---|
| 1. Root cause | Read errors, build loop, reproduce, trace data flow | Understand what and why |
| 2. Pattern analysis | Find working examples, compare | Identify differences |
| 3. Hypothesis | Form theory, test minimally | Confirmed or new hypothesis |
| 4. Implementation | Failing test, single fix, verify | Bug resolved, tests pass |

## Debug Summary

After each session, summarize:

```
## Debug Summary

**Problem:** [One sentence]
**Root Cause:** [What actually was wrong]
**Fix:** [How you fixed it]
**Verification:** [Test results]
**Prevention:** [Regression test added? Architectural finding?]
```

## References

- **Language-specific tools** → `references/language-tools.md`
- **Common bug patterns** → `references/bug-patterns.md`
- **Logging & techniques** → `references/techniques.md`

Structure inspired by [obra/superpowers systematic-debugging](https://github.com/obra/superpowers).
