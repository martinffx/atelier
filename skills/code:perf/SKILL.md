---
name: code:perf
description: >
  Performance profiling and optimization. Use when code is slow, has memory issues, or needs
  optimization. Triggers on "slow", "performance", "optimize", "memory leak", "profiling",
  "bottleneck", or any performance-related concern.
user-invocable: true
---

# Code Perf

Performance profiling and optimization workflow.

## The Golden Rule

**Never optimize without profiling.**

You don't know where the bottleneck is until you measure. Making changes without
profiling wastes time and often makes things worse.

---

## Workflow

### 1. Profile

Measure the current performance.

**Questions:**
- What's slow? (endpoint, operation, page load)
- How slow? (latency, throughput)
- Under what conditions? (load, data size)

**Tools:**
- Browser DevTools (Performance tab)
- Node clinic.js
- Python cProfile
- Go pprof

### 2. Identify

Find the hot paths.

**Look for:**
- Functions called many times
- Large memory allocations
- Blocking I/O
- Unnecessary computations

### 3. Optimize

Apply the right optimization pattern.

### 4. Verify

Re-profile to confirm improvement.

---

## Common Bottlenecks

See references/common-bottlenecks.md for detailed patterns:

| Pattern | Symptom | Solution |
|---------|---------|----------|
| N+1 | Multiple DB queries | Eager load, batch |
| Memory leak | Growing RSS | Clear caches, weak refs |
| Blocking I/O | Thread blocked | Async, worker pool |
| Unnecessary work | CPU high | Skip redundant calc |
| Large data | Slow serialization | Pagination, streams |

---

## Optimization Patterns

See references/optimization-patterns.md for:

### Caching

```javascript
// Before: every call hits DB
const user = await db.users.find(id);

// After: cache
const cacheKey = `user:${id}`;
let user = await redis.get(cacheKey);
if (!user) {
  user = await db.users.find(id);
  await redis.set(cacheKey, user, 'EX', 300);
}
```

### Lazy Loading

```javascript
// Before: load everything
const allUsers = await db.users.findMany();

// After: paginate
const users = await db.users.findMany({
  take: 20,
  skip: page * 20
});
```

### Connection Pooling

```javascript
// Before: new connection each time
const client = new Client();
await client.connect();

// After: pool
const pool = new Pool({ max: 20 });
// Use pool.query() throughout
```

---

## Profiling Tools

See references/profiling-tools.md for:

### Node.js

```bash
# CPU profiling
node --prof app.js

# Memory
node --inspect app.js  # Chrome DevTools

# clinic.js
npx clinic doctor -- node app.js
```

### Python

```bash
# cProfile
python -m cProfile -o profile.prof app.py

# view with: python -m cProfile -s cumulative app.py
```

### Go

```bash
# pprof
go test -cpuprofile=cpu.prof
go tool pprof cpu.prof

# Web interface
go tool pprof -http=:8080 cpu.prof
```

---

## Skill Loading

- If optimization involves queries → load python:sqlalchemy or typescript:drizzle-orm
- If memory issues → load for heap snapshots
- If database → load appropriate database skill
