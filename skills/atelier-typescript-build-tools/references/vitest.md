# Advanced Vitest Patterns

Detailed Vitest configuration patterns for complex setups including workspaces, benchmarks, and database testing.

## Workspace Configuration

Use workspaces when you need different test configurations (e.g., unit tests vs integration tests with different parallelism).

### vitest.workspace.ts

```typescript
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      name: 'unit',
      include: ['src/**/*.test.ts'],
      exclude: ['src/**/*.repo.test.ts'],
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'repo',
      include: ['src/**/*.repo.test.ts'],
      fileParallelism: false,  // Sequential for DB tests
      testTimeout: 30000,
    },
  },
])
```

### Running Specific Workspaces

```bash
# Run all workspaces
vitest run

# Run specific workspace
vitest run --project unit
vitest run --project repo

# Run in watch mode
vitest --project unit
```

## Benchmark Configuration

```typescript
// vitest.config.benchmark.ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    benchmark: {
      include: ['src/**/*.bench.ts'],
      reporters: ['default'],
    },
    testTimeout: 120000,  // 2 minutes for benchmarks
  },
})
```

### Benchmark Example

```typescript
// src/utils/hash.bench.ts
import { bench, describe } from 'vitest'
import { hashPassword, verifyPassword } from './hash'

describe('password hashing', () => {
  bench('hashPassword', async () => {
    await hashPassword('test-password-123')
  })

  bench('verifyPassword', async () => {
    const hash = await hashPassword('test-password-123')
    await verifyPassword('test-password-123', hash)
  })
})
```

### Running Benchmarks

```bash
# Run benchmarks
vitest bench

# Run with specific config
vitest bench --config vitest.config.benchmark.ts
```

## Database Test Setup

### Global Setup for Migrations

```typescript
// test/global-setup.ts
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import { Database } from 'bun:sqlite'

export async function setup() {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)

  console.log('Running migrations...')
  migrate(db, { migrationsFolder: './drizzle' })

  // Store for use in tests
  globalThis.__TEST_DB__ = db
}

export async function teardown() {
  globalThis.__TEST_DB__?.close()
}
```

### Per-Test Setup

```typescript
// test/setup.ts
import { beforeEach, afterEach } from 'vitest'
import { users } from '../src/schema'

beforeEach(async () => {
  // Reset database state before each test
  await globalThis.__TEST_DB__.delete(users)
})

afterEach(async () => {
  // Cleanup after each test
})
```

### Using in Tests

```typescript
// src/users.test.ts
import { describe, it, expect } from 'vitest'
import { UserRepo } from './UserRepo'

describe('UserRepo', () => {
  it('creates a user', async () => {
    const db = globalThis.__TEST_DB__
    const repo = new UserRepo(db)

    const user = await repo.create({
      name: 'Alice',
      email: 'alice@example.com',
    })

    expect(user.id).toBeDefined()
    expect(user.name).toBe('Alice')
  })
})
```

## Coverage Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.bench.ts',
        'src/types/**',
        'src/**/*.d.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
```

### Running Coverage

```bash
# Run tests with coverage
vitest run --coverage

# Generate coverage report
vitest run --coverage --reporter=html

# Fail if coverage below threshold
vitest run --coverage --coverage.thresholds.lines=80
```

## Cloudflare Workers Pool

For testing Cloudflare Workers and Durable Objects:

```typescript
// vitest.config.ts
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    globals: true,
    pool: '@cloudflare/vitest-pool-workers',
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          compatibilityDate: '2024-11-01',
          compatibilityFlags: ['nodejs_compat'],
        },
      },
    },
  },
})
```

### Test Helper for Durable Objects

```typescript
// test/helpers.ts
import { env, runInDurableObject } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/durable-sqlite'
import * as schema from '../src/schema'

export async function withTestDB<T>(
  fn: (db: ReturnType<typeof drizzle>) => Promise<T>
): Promise<T> {
  const id = env.USER_LEDGER.newUniqueId()
  const stub = env.USER_LEDGER.get(id)

  return runInDurableObject(stub, async (_instance, state) => {
    const db = drizzle(state.storage, { schema })
    return fn(db)
  })
}
```

### Using in Tests

```typescript
// src/ledger.test.ts
import { describe, it, expect } from 'vitest'
import { withTestDB } from '../test/helpers'
import { LedgerRepo } from './LedgerRepo'

describe('LedgerRepo', () => {
  it('creates a ledger', async () => {
    await withTestDB(async (db) => {
      const repo = new LedgerRepo(db)
      const ledger = await repo.create({ name: 'Test Ledger' })

      expect(ledger.id).toBeDefined()
      expect(ledger.name).toBe('Test Ledger')
    })
  })
})
```

## Snapshot Testing

```typescript
// user.test.ts
import { test, expect } from 'vitest'
import { UserEntity } from './UserEntity'

test('user response matches snapshot', () => {
  const user = UserEntity.fromRequest({
    name: 'Alice',
    email: 'alice@example.com',
  })

  expect(user.toResponse()).toMatchSnapshot()
})
```

### Updating Snapshots

```bash
# Update all snapshots
vitest run -u

# Update snapshots for specific file
vitest run -u src/users.test.ts
```

## Mock Patterns

### Module Mocking

```typescript
import { vi, test, expect, beforeEach } from 'vitest'
import { sendEmail } from './email'
import { createUser } from './users'

vi.mock('./email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

test('sends welcome email', async () => {
  await createUser({ name: 'Alice', email: 'alice@example.com' })

  expect(sendEmail).toHaveBeenCalledWith({
    to: 'alice@example.com',
    subject: 'Welcome!',
  })
})
```

### Spy on Functions

```typescript
import { vi, test, expect } from 'vitest'

test('logs errors', async () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  await processItem(invalidItem)

  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining('Invalid item')
  )

  consoleSpy.mockRestore()
})
```

### Mock Timers

```typescript
import { vi, test, expect } from 'vitest'

test('delays execution', async () => {
  vi.useFakeTimers()

  const callback = vi.fn()
  setTimeout(callback, 1000)

  // Fast-forward time
  vi.advanceTimersByTime(1000)

  expect(callback).toHaveBeenCalled()

  vi.useRealTimers()
})
```

## Filtering Tests

### Run Specific Tests

```bash
# Run specific test file
vitest src/users.test.ts

# Run tests matching pattern
vitest --grep "UserRepo"

# Skip tests matching pattern
vitest --grep -v "integration"
```

### Test-Only and Skip

```typescript
import { describe, it, test } from 'vitest'

describe('UserRepo', () => {
  // Only run this test
  it.only('creates a user', async () => {
    // ...
  })

  // Skip this test
  it.skip('updates a user', async () => {
    // ...
  })

  // Run if condition is true
  it.runIf(process.env.CI)('runs in CI', async () => {
    // ...
  })

  // Skip if condition is true
  it.skipIf(process.platform === 'win32')('runs on Unix', async () => {
    // ...
  })
})
```

## Parallelism Control

### Disable File Parallelism

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    fileParallelism: false,  // Run test files sequentially
  },
})
```

### Configure Max Threads

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 1,
      },
    },
  },
})
```

## Test Retries

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    retry: 2,  // Retry failed tests up to 2 times
  },
})
```

### Per-Test Retries

```typescript
import { it } from 'vitest'

it('flaky test', { retry: 3 }, async () => {
  // Test that might fail occasionally
})
```

## Debugging Tests

### VSCode Launch Config

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Vitest Tests",
      "runtimeExecutable": "bun",
      "runtimeArgs": ["run", "vitest", "run"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Run with Debugging

```bash
# Run tests with debugger
vitest --inspect-brk

# Run specific test with debugger
vitest --inspect-brk src/users.test.ts
```

## UI Mode

```bash
# Run tests in UI mode
vitest --ui

# Run with specific port
vitest --ui --port 5173
```

## Best Practices

1. **Separate unit and integration tests** with workspace configs
2. **Disable file parallelism** for database tests (`fileParallelism: false`)
3. **Use global setup** for one-time migrations
4. **Use setup files** for per-test reset
5. **Set appropriate timeouts** - 30s for DB tests, 2min for benchmarks
6. **Use V8 provider** for coverage - more accurate than Istanbul
7. **Configure coverage thresholds** to prevent regression
8. **Use snapshots sparingly** - only for complex output structures
9. **Mock external services** - email, third-party APIs
10. **Clean up after tests** - delete created records, restore mocks
11. **Use workspace separation** for tests that need different environments
12. **Name test files descriptively** - `*.test.ts` for unit, `*.repo.test.ts` for DB
