# Optimization Patterns

## Caching

### When
- Same data requested multiple times
- Expensive computation
- External API calls

### Patterns

**In-memory:**
```javascript
const cache = new Map();

async function getUser(id) {
  if (cache.has(id)) return cache.get(id);
  const user = await db.find(id);
  cache.set(id, user);
  return user;
}
```

**With TTL:**
```javascript
function withTTL(cache, ttl) {
  return {
    get(key) {
      const item = cache.get(key);
      if (item && Date.now() - item.timestamp < ttl) {
        return item.value;
      }
      return null;
    },
    set(key, value) {
      cache.set(key, { value, timestamp: Date.now() });
    }
  };
}
```

**Distributed (Redis):**
```javascript
async function getCached(key, fetcher, ttl = 300) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const value = await fetcher();
  await redis.set(key, JSON.stringify(value), 'EX', ttl);
  return value;
}
```

---

## Lazy Loading

### When
- Large data sets
- Heavy imports
- Optional features

### Patterns

**Pagination:**
```javascript
async function getUsers(page = 1, limit = 20) {
  return db.users.findMany({
    take: limit,
    skip: (page - 1) * limit,
    orderBy: { createdAt: 'desc' }
  });
}
```

**Code splitting:**
```javascript
// Before: import everything
import * as heavy from './heavy';

// After: dynamic import
const heavy = await import('./heavy');
```

**Virtual scrolling:**
```javascript
// Only render visible items
<VirtualList items={users} height={400} itemHeight={40} />
```

---

## Connection Pooling

### When
- Database connections
- HTTP clients
- WebSocket connections

### Patterns

```javascript
import { Pool } from 'pg';

const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Use throughout
const result = await pool.query('SELECT * FROM users');
```

---

## Batch Operations

### When
- Multiple inserts/updates
- Multiple API calls

### Patterns

**Bulk insert:**
```javascript
// Before: N queries
for (const item of items) {
  await db.insert(item);
}

// After: 1 query
await db.insertMany(items);
```

**Batch API calls:**
```javascript
// Use Promise.all with limit
async function batch(items, fn, limit = 10) {
  const results = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    results.push(...await Promise.all(batch.map(fn)));
  }
  return results;
}
```

---

## Memoization

```javascript
function memoize(fn) {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

// Usage
const fib = memoize(n => n <= 1 ? n : fib(n-1) + fib(n-2));
```
