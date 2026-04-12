# Common Performance Bottlenecks

## N+1 Query Problem

### Symptom
Many database queries when one should suffice.

### Diagnosis
```sql
-- Enable query logging
-- See N+1 queries in logs
```

### Solution

**Before:**
```python
for user in users:
    print(user.profile.name)  # Each = query
```

**After:**
```python
# Eager load
users = db.query(users).options(joinedload(User.profile)).all()

# Or batch
profiles = ProfileService.get_many([u.id for u in users])
```

---

## Memory Leaks

### Symptom
RSS grows over time, never回收es.

### Diagnosis
- Chrome DevTools Memory tab
- heap snapshots before/after

### Common Causes

1. **Unclosed connections**
2. **Growing caches** (no eviction)
3. **Event listeners** (not removed)
4. **Closures holding references**
5. **Global variables**

### Solution
```javascript
// Clear cache
cache.clear();

// Remove listener
element.removeEventListener('click', handler);

// Use weak refs
const ref = new WeakRef(obj);
```

---

## Blocking I/O

### Symptom
Thread/process blocked, can't handle other requests.

### Solution

```javascript
// Before: blocking
const data = fs.readFileSync('file.txt');

// After: async
const data = await fs.promises.readFile('file.txt');
```

---

## Unnecessary Work

### Symptom
CPU high, doing redundant computation.

### Examples

1. **Validation twice** - in frontend and backend
2. **Same calculation multiple times**
3. **Processing data not needed**

### Solution
```javascript
// Cache expensive computations
const memoize = fn => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    return cache.get(key) ?? fn(...args);
  };
};
```

---

## Large Data Serialization

### Symptom
Slow JSON serialization of large objects.

### Solution

```javascript
// Pagination
const page = req.query.page || 1;
const limit = 20;
const users = await db.users.findMany({
  take: limit,
  skip: (page - 1) * limit
});

// Streams for large files
stream.pipe(JSON.stringify());
```
