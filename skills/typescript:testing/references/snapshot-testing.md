# Snapshot Testing Patterns

Comprehensive guide to snapshot testing with Vitest for validating complex objects, UI output, and generated code.

## Basic Snapshot Testing

### First Snapshot

```typescript
import { it, expect } from 'vitest'

it('generates user profile', () => {
  const profile = {
    id: '123',
    name: 'Alice',
    email: 'alice@example.com',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
  }

  // Creates snapshot file on first run
  expect(profile).toMatchSnapshot()
})
```

First run creates: `__snapshots__/test-file.spec.ts.snap`

```typescript
// Vitest Snapshot v1

exports[`generates user profile 1`] = `
{
  "id": "123",
  "name": "Alice",
  "email": "alice@example.com",
  "role": "admin",
  "createdAt": 2024-01-01T00:00:00.000Z,
}
`
```

### Snapshot Assertions

```typescript
// Basic snapshot
expect(value).toMatchSnapshot()

// Named snapshot (multiple in one test)
expect(value1).toMatchSnapshot('first snapshot')
expect(value2).toMatchSnapshot('second snapshot')

// Inline snapshot
expect(value).toMatchInlineSnapshot(`
  {
    "id": "123",
    "name": "Alice",
  }
`)

// File snapshot (for large output)
expect(generatedCode).toMatchFileSnapshot('__snapshots__/output.txt')
```

## Inline Snapshots

### Basic Inline Snapshot

```typescript
it('formats error message', () => {
  const error = formatError(new Error('Something failed'))

  expect(error).toMatchInlineSnapshot(`
    {
      "message": "Something failed",
      "code": "UNKNOWN_ERROR",
      "timestamp": 1234567890,
    }
  `)
})
```

Vitest automatically writes the snapshot inline on first run.

### Benefits of Inline Snapshots

- See expected value directly in test code
- No separate snapshot file to manage
- Great for small, focused snapshots
- Easier to review in pull requests
- Better for objects with few properties

### When to Use Inline vs File Snapshots

```typescript
// INLINE - Small, focused objects
expect(user.toJSON()).toMatchInlineSnapshot(`
  {
    "id": "123",
    "name": "Alice",
  }
`)

// FILE - Large objects or complex structures
expect(entireApiResponse).toMatchSnapshot()

// FILE - Generated code or markup
expect(generatedHTML).toMatchSnapshot()
```

## Property Matchers

### Handling Dynamic Values

```typescript
it('creates order with timestamp', () => {
  const order = createOrder({
    items: ['item1', 'item2'],
  })

  // Without property matchers - BREAKS on every run!
  // expect(order).toMatchSnapshot() ❌

  // With property matchers - handles dynamic values
  expect(order).toMatchSnapshot({
    id: expect.any(String),
    createdAt: expect.any(Date),
  })
})
```

Snapshot file shows matchers:

```typescript
exports[`creates order 1`] = `
{
  "id": Any<String>,
  "createdAt": Any<Date>,
  "items": ["item1", "item2"],
  "status": "pending",
}
`
```

### Common Property Matchers

```typescript
expect(object).toMatchSnapshot({
  // Type matchers
  id: expect.any(String),
  count: expect.any(Number),
  active: expect.any(Boolean),
  createdAt: expect.any(Date),
  data: expect.any(Object),
  tags: expect.any(Array),

  // Pattern matchers
  email: expect.stringMatching(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/),
  uuid: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-/),

  // Range matchers
  price: expect.closeTo(19.99, 0.01),

  // Object matchers
  user: expect.objectContaining({
    name: 'Alice',
  }),

  // Array matchers
  tags: expect.arrayContaining(['typescript', 'testing']),
})
```

### Nested Property Matchers

```typescript
it('handles nested dynamic values', () => {
  const response = {
    data: {
      user: {
        id: crypto.randomUUID(),
        name: 'Alice',
        createdAt: new Date(),
      },
    },
    meta: {
      requestId: crypto.randomUUID(),
      timestamp: Date.now(),
    },
  }

  expect(response).toMatchSnapshot({
    data: {
      user: {
        id: expect.any(String),
        createdAt: expect.any(Date),
      },
    },
    meta: {
      requestId: expect.any(String),
      timestamp: expect.any(Number),
    },
  })
})
```

## Updating Snapshots

### Update All Snapshots

```bash
# Update all outdated snapshots
vitest -u

# or
vitest --update
```

### Update Specific Snapshots

```bash
# Run specific test file and update
vitest path/to/test.spec.ts -u

# Update only tests matching pattern
vitest -t "user profile" -u
```

### Interactive Update

```bash
# Watch mode with interactive updates
vitest --ui

# Press 'u' to update failing snapshots
# Press 'i' to update snapshot interactively
```

### When to Update Snapshots

```typescript
// ✅ GOOD REASONS to update:
// - Intentional behavior change
// - New feature added
// - Bug fix that changes output
// - Refactoring that changes structure

// ❌ BAD REASONS to update:
// - Test is failing and you don't know why
// - You didn't review the diff
// - To make CI pass quickly
// - Random non-deterministic changes
```

## File Snapshots

### Basic File Snapshot

```typescript
import { it, expect } from 'vitest'
import { generateComponent } from './generator'

it('generates React component', () => {
  const code = generateComponent({
    name: 'UserProfile',
    props: ['name', 'email'],
  })

  expect(code).toMatchFileSnapshot('__snapshots__/UserProfile.tsx')
})
```

Creates: `__snapshots__/UserProfile.tsx`

```typescript
import React from 'react'

interface UserProfileProps {
  name: string
  email: string
}

export function UserProfile({ name, email }: UserProfileProps) {
  return (
    <div>
      <h1>{name}</h1>
      <p>{email}</p>
    </div>
  )
}
```

### Custom Snapshot Directory

```typescript
// Organize snapshots by feature
expect(output).toMatchFileSnapshot('./__snapshots__/feature/output.txt')

// Keep snapshots close to tests
expect(output).toMatchFileSnapshot('./snapshots/expected-output.txt')
```

### Multiple File Snapshots

```typescript
it('generates multiple files', () => {
  const files = generateProject({ name: 'my-app' })

  expect(files.index).toMatchFileSnapshot('snapshots/index.tsx')
  expect(files.config).toMatchFileSnapshot('snapshots/config.json')
  expect(files.readme).toMatchFileSnapshot('snapshots/README.md')
})
```

## Custom Serializers

### Basic Custom Serializer

```typescript
import { expect } from 'vitest'

// Custom serializer for Date objects
expect.addSnapshotSerializer({
  test: (val) => val instanceof Date,
  serialize: (val: Date) => `Date<${val.toISOString()}>`,
})

// Now dates serialize consistently
expect({ createdAt: new Date('2024-01-01') }).toMatchInlineSnapshot(`
  {
    "createdAt": Date<2024-01-01T00:00:00.000Z>,
  }
`)
```

### Complex Serializer Example

```typescript
// Serializer for BigInt
expect.addSnapshotSerializer({
  test: (val) => typeof val === 'bigint',
  serialize: (val: bigint) => `${val.toString()}n`,
})

// Serializer for class instances
class User {
  constructor(public name: string, public email: string) {}
}

expect.addSnapshotSerializer({
  test: (val) => val instanceof User,
  serialize: (val: User) => {
    return `User { name: ${val.name}, email: ${val.email} }`
  },
})

// Usage
const user = new User('Alice', 'alice@example.com')
expect(user).toMatchInlineSnapshot(`User { name: Alice, email: alice@example.com }`)
```

### Setup Serializers Globally

```typescript
// tests/setup.ts
import { expect, beforeAll } from 'vitest'

beforeAll(() => {
  // Add all custom serializers
  expect.addSnapshotSerializer({
    test: (val) => val instanceof Date,
    serialize: (val: Date) => `Date<${val.toISOString()}>`,
  })

  expect.addSnapshotSerializer({
    test: (val) => typeof val === 'bigint',
    serialize: (val: bigint) => `${val.toString()}n`,
  })
})
```

## Best Practices

### Snapshot Size

```typescript
// ✅ GOOD - Focused snapshot
it('formats user display name', () => {
  const display = formatDisplayName(user)
  expect(display).toMatchInlineSnapshot(`"Alice (alice@example.com)"`)
})

// ❌ BAD - Too large, hard to review
it('returns entire API response', async () => {
  const response = await api.getEverything()
  expect(response).toMatchSnapshot() // 500+ lines
})

// ✅ BETTER - Snapshot specific parts
it('returns correct user data structure', async () => {
  const response = await api.getUsers()
  expect(response.users[0]).toMatchSnapshot({
    id: expect.any(String),
    createdAt: expect.any(Date),
  })
})
```

### When to Use Snapshots

```typescript
// ✅ GOOD USE CASES:
// - Generated code or markup
// - Complex nested objects
// - API response structures
// - Error message formats
// - Configuration objects

it('generates SQL query', () => {
  const query = buildQuery({ table: 'users', where: { active: true } })
  expect(query).toMatchInlineSnapshot(`
    SELECT * FROM users
    WHERE active = true
  `)
})

// ❌ BAD USE CASES:
// - Simple primitives
// - Single boolean/number assertions
// - Critical business logic

// Bad - too simple for snapshot
it('returns user count', () => {
  expect(users.length).toMatchInlineSnapshot(`5`) // Just use toBe(5)
})

// Bad - critical logic needs explicit assertion
it('calculates correct total', () => {
  expect(calculateTotal(cart)).toMatchInlineSnapshot(`19.99`)
  // Should use: expect(calculateTotal(cart)).toBe(19.99)
})
```

### Explicit vs Snapshot Assertions

```typescript
// ✅ CRITICAL VALUES - Use explicit assertions
it('charges correct amount', () => {
  const charge = processPayment(order)
  expect(charge.amount).toBe(19.99) // Explicit - catches regressions
  expect(charge.currency).toBe('USD')
})

// ✅ STRUCTURE - Use snapshots
it('returns payment receipt structure', () => {
  const receipt = processPayment(order)
  expect(receipt).toMatchSnapshot({
    transactionId: expect.any(String),
    timestamp: expect.any(Date),
  })
})
```

## Testing React Components

### Component Snapshot

```typescript
import { render } from '@testing-library/react'
import { UserProfile } from './UserProfile'

it('renders user profile', () => {
  const { container } = render(
    <UserProfile name="Alice" email="alice@example.com" />
  )

  expect(container.firstChild).toMatchInlineSnapshot(`
    <div class="profile">
      <h1>Alice</h1>
      <p>alice@example.com</p>
    </div>
  `)
})
```

### Snapshot Query Results

```typescript
it('shows search results', () => {
  const { getByRole } = render(<SearchResults query="react" />)

  expect(getByRole('list')).toMatchSnapshot()
})
```

### Avoid Snapshot Testing UI Too Much

```typescript
// ❌ BAD - Brittle, breaks on style changes
it('renders button', () => {
  const { container } = render(<Button>Click me</Button>)
  expect(container).toMatchSnapshot()
})

// ✅ BETTER - Test behavior, not structure
it('calls onClick when clicked', () => {
  const onClick = vi.fn()
  const { getByText } = render(<Button onClick={onClick}>Click me</Button>)

  fireEvent.click(getByText('Click me'))
  expect(onClick).toHaveBeenCalledOnce()
})
```

## Debugging Snapshots

### Viewing Snapshot Diffs

```bash
# Run tests and see diff
vitest

# Vitest shows:
# ✓ Expected
# ✗ Received
```

### Example Diff Output

```diff
- Expected
+ Received

  Object {
    "name": "Alice",
-   "email": "alice@example.com",
+   "email": "alice@newdomain.com",
    "role": "admin",
  }
```

### Debugging Tips

```typescript
// 1. Use console.log to inspect value
it('generates config', () => {
  const config = generateConfig()
  console.log(JSON.stringify(config, null, 2))
  expect(config).toMatchSnapshot()
})

// 2. Use snapshot with property matchers
expect(value).toMatchSnapshot({
  id: expect.any(String), // Ignore dynamic ID
})

// 3. Break down large snapshots
it('has correct structure', () => {
  expect(response.user).toMatchSnapshot()
  expect(response.meta).toMatchSnapshot()
  expect(response.data).toMatchSnapshot()
})
```

## Common Patterns

### Testing Transformations

```typescript
it('transforms API response to UI format', () => {
  const apiResponse = {
    user_id: '123',
    user_name: 'Alice',
    created_at: '2024-01-01T00:00:00Z',
  }

  const uiFormat = transformToUI(apiResponse)

  expect(uiFormat).toMatchInlineSnapshot(`
    {
      "id": "123",
      "name": "Alice",
      "createdAt": "Jan 1, 2024",
    }
  `)
})
```

### Testing Error Messages

```typescript
it('formats validation errors', () => {
  const errors = validateUser({
    name: '',
    email: 'invalid',
  })

  expect(errors).toMatchInlineSnapshot(`
    [
      {
        "field": "name",
        "message": "Name is required",
      },
      {
        "field": "email",
        "message": "Invalid email format",
      },
    ]
  `)
})
```

### Testing Generated Code

```typescript
it('generates TypeScript interface', () => {
  const code = generateInterface({
    name: 'User',
    properties: {
      id: 'string',
      name: 'string',
      age: 'number',
    },
  })

  expect(code).toMatchInlineSnapshot(`
    "interface User {
      id: string
      name: string
      age: number
    }"
  `)
})
```

### Testing API Contracts

```typescript
it('returns correct API response format', async () => {
  const response = await api.getUser('123')

  expect(response).toMatchSnapshot({
    id: expect.any(String),
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
  })
})
```

## Guidelines

1. **Review snapshot diffs carefully** - Don't blindly update failing snapshots
2. **Use property matchers for dynamic values** - Dates, IDs, timestamps should use `expect.any()`
3. **Keep snapshots focused and small** - Large snapshots are hard to review and maintain
4. **Inline for small objects, file for large** - Use inline snapshots for objects < 10 lines
5. **Explicit assertions for critical values** - Don't snapshot business-critical calculations
6. **Named snapshots for multiple per test** - Use descriptive names: `.toMatchSnapshot('error state')`
7. **Custom serializers for consistency** - Add serializers for Date, BigInt, class instances
8. **Update intentionally, not reactively** - Understand why snapshot changed before updating
9. **Commit snapshot files** - Snapshots are part of your test suite
10. **Avoid snapshotting UI structure** - Test behavior, not implementation details
11. **Use snapshots for regression testing** - Great for ensuring output doesn't change unexpectedly
12. **Document non-obvious snapshots** - Add comments explaining complex snapshot expectations

## Common Pitfalls

### Non-Deterministic Snapshots

```typescript
// ❌ BAD - Fails randomly due to Date.now()
it('creates timestamp', () => {
  const data = { timestamp: Date.now() }
  expect(data).toMatchSnapshot() // Different every time!
})

// ✅ GOOD - Use property matcher
it('creates timestamp', () => {
  const data = { timestamp: Date.now() }
  expect(data).toMatchSnapshot({
    timestamp: expect.any(Number),
  })
})
```

### Snapshots Too Large

```typescript
// ❌ BAD - 500 line snapshot
it('returns all data', async () => {
  const data = await fetchEverything()
  expect(data).toMatchSnapshot() // Unmaintainable
})

// ✅ GOOD - Focused snapshots
it('returns user list structure', async () => {
  const data = await fetchEverything()
  expect(data.users[0]).toMatchSnapshot({
    id: expect.any(String),
    createdAt: expect.any(Date),
  })
})
```

### Blindly Updating Snapshots

```typescript
// ❌ BAD PROCESS:
// 1. Test fails
// 2. Run `vitest -u` without checking diff
// 3. Commit updated snapshot
// 4. Ship bug to production

// ✅ GOOD PROCESS:
// 1. Test fails
// 2. Review snapshot diff carefully
// 3. Determine if change is intentional
// 4. If yes: update snapshot, if no: fix code
// 5. Verify test passes with new snapshot
```

### Snapshotting Implementation Details

```typescript
// ❌ BAD - Snapshots component internals
it('renders user list', () => {
  const { container } = render(<UserList />)
  expect(container.innerHTML).toMatchSnapshot() // Breaks on any DOM change
})

// ✅ GOOD - Test user-facing behavior
it('displays all users', () => {
  const { getByText } = render(<UserList />)
  expect(getByText('Alice')).toBeInTheDocument()
  expect(getByText('Bob')).toBeInTheDocument()
})
```

## Snapshot Maintenance

### Regular Review

```bash
# Check for outdated snapshots
vitest --reporter=verbose

# List all snapshot files
find . -name "*.snap" -o -name "*.snap.txt"

# Check snapshot file sizes
find . -name "*.snap" -exec wc -l {} \; | sort -rn
```

### Removing Unused Snapshots

```bash
# Vitest automatically removes unused snapshots
vitest -u

# Or manually delete snapshot file and re-run
rm __snapshots__/old-test.spec.ts.snap
vitest
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Run tests
  run: vitest run

# Fail if snapshots need updating
- name: Check for snapshot changes
  run: |
    git diff --exit-code "**/*.snap"
```
