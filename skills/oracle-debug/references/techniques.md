# Debugging Techniques

## Print Debugging

### When to Use
- Quick checks in development
- When debugger isn't available
- Understanding flow in unfamiliar code
- Minimal reproducible cases

### Best Practices

**Do:**
- Print at function entry/exit to trace execution
- Print variable values at key decision points
- Use descriptive labels: `console.log('userId:', userId)`
- Print full objects for inspection: `console.log(JSON.stringify(data, null, 2))`

**Don't:**
- Leave print statements in production code
- Print sensitive data (passwords, tokens)
- Over-print (noise obscures signal)
- Print in tight loops (use breakpoints instead)

### Tagged Debug Logs

When instrumenting during a debugging session, tag every temporary log with a
unique prefix so cleanup is trivial:

```javascript
console.log('[DEBUG-a4f2] userId:', userId);
console.log('[DEBUG-a4f2] payload:', payload);
```

Cleanup: `grep -r '\[DEBUG-' .` → delete all matches.

Untagged logs survive; tagged logs die.

---

## Structured Logging

Better than `console.log` for production:

```javascript
const logger = {
  debug: (msg, meta) => console.debug(JSON.stringify({ level: 'debug', msg, ...meta })),
  info: (msg, meta) => console.info(JSON.stringify({ level: 'info', msg, ...meta })),
  warn: (msg, meta) => console.warn(JSON.stringify({ level: 'warn', msg, ...meta })),
  error: (msg, meta) => console.error(JSON.stringify({ level: 'error', msg, ...meta })),
};
```

### Console Methods

| Method | Use |
|--------|-----|
| console.log | General output |
| console.debug | Debug info |
| console.info | Informational |
| console.warn | Warnings |
| console.error | Errors |
| console.table | Arrays/objects in table format |
| console.trace | Stack trace |
| console.time/timeEnd | Timing |

---

## Binary Search Debugging

### Code Binary Search

Comment out half the code to find where the bug is.

### Git Bisect

For regression bugs:

```bash
git bisect start
git bisect bad
git bisect good v1.2.3
# Run your test, mark good/bad
git bisect reset
```

---

## Rubber Ducking

### The Process

1. Describe the problem in detail
2. Explain expected behavior
3. Explain actual behavior
4. Walk through the code line by line

---

## Logging Strategies

### What to Log

| Log This | Don't Log This |
|----------|----------------|
| Request/response with IDs | Full request bodies |
| Key decisions in code | Every loop iteration |
| Error details with context | Stack traces |
| Performance timing | Large data dumps |
| User actions | Sensitive data (PII, passwords) |

### Context to Include

```javascript
logger.error('Request failed', {
  endpoint: '/api/users',
  method: 'POST',
  statusCode: 500,
  userId: user?.id,
  requestId: req.headers['x-request-id'],
  duration: Date.now() - startTime,
  errorMessage: error.message
});
```

### Log Levels

| Level | When |
|-------|------|
| DEBUG | Detailed debugging info |
| INFO | Normal operation events |
| WARN | Something unexpected, but handled |
| ERROR | Operation failed |

---

## Performance Regression Techniques

### The Perf Branch

For performance regressions, logs are usually wrong. Instead:

1. **Establish a baseline measurement** using one of:
   - Timing harness around the suspect code path
   - `performance.now()` in browser / `process.hrtime()` in Node
   - CPU profiler (Chrome DevTools, `node --prof`, py-spy, etc.)
   - Database query planner (`EXPLAIN ANALYZE`)

2. **Bisect** — narrow down which commit / change introduced the regression.

3. **Measure first, fix second.** Do not optimise without data.

### Hot Path Identification

- Profile before guessing
- Look for O(n²) algorithms, unnecessary renders, blocking operations
- Check for N+1 queries, unbounded caches, recursive without memoisation
