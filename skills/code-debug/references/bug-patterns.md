# Common Bug Patterns

Quick reference for recognising and fixing recurring bug categories.

---

## Null/Undefined Errors

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

---

## Race Conditions

**Symptoms:** Intermittent failures, flaky tests

**Debug approach:**
1. Identify async operations
2. Find timing dependencies
3. Add delays or force ordering to confirm

**Fix patterns:**
- Use async/await properly
- Add proper synchronization
- Consider immutable state

---

## Logic Errors

**Symptoms:** Wrong output, wrong behaviour

**Debug approach:**
1. Trace through the logic manually
2. Compare expected vs actual at each step
3. Find the first step that diverges

**Fix patterns:**
- Fix the condition
- Correct the calculation
- Update the state correctly

---

## Performance Issues

**Symptoms:** Slow, memory leaks, timeouts

**Debug approach:**
1. Measure first (don't guess)
2. Identify hot paths
3. Optimize the bottleneck

**See also:** Phase 4 "Perf branch" in SKILL.md for the disciplined approach.
