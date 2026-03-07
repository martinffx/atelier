# Mocking Patterns with Vitest

Comprehensive guide to mocking modules, functions, classes, and dependencies in Vitest tests.

## Module Mocking

### Auto-mocking Entire Modules

```typescript
import { vi } from 'vitest'
import * as userRepo from './user-repository'

// Auto-mock all exports
vi.mock('./user-repository')

// All functions are now mocks
expect(vi.isMockFunction(userRepo.findById)).toBe(true)
expect(vi.isMockFunction(userRepo.save)).toBe(true)
```

### Partial Module Mocking

```typescript
vi.mock('./user-repository', () => ({
  // Keep real implementation
  ...vi.importActual('./user-repository'),

  // Mock specific functions
  findById: vi.fn(),
  save: vi.fn(),
}))

// Now some functions are real, some are mocked
await userRepo.validateEmail('test@example.com') // real
await userRepo.findById('123') // mocked
```

### Factory Functions

```typescript
vi.mock('./database', () => {
  const mockDb = {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    query: vi.fn(),
  }

  return {
    createConnection: () => mockDb,
    Database: class MockDatabase {
      connect = mockDb.connect
      query = mockDb.query
    }
  }
})
```

## Typed Mocks

### Creating Typed Mock Objects

```typescript
import { vi } from 'vitest'
import type { UserRepository } from './types'

// Create fully typed mock
const mockUserRepo = vi.mocked<UserRepository>({
  findById: vi.fn(),
  findByEmail: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
})

// Type-safe mock setup
mockUserRepo.findById.mockResolvedValue({
  id: '123',
  name: 'Alice',
  email: 'alice@example.com',
})

// TypeScript catches type errors
// @ts-expect-error - wrong return type
mockUserRepo.findById.mockResolvedValue({ invalid: 'data' })
```

### Generic Typed Mocks

```typescript
function createMockRepository<T>(): Repository<T> {
  return {
    findById: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  }
}

// Use with specific types
const userRepo = createMockRepository<User>()
const orderRepo = createMockRepository<Order>()

// Fully typed
userRepo.findById.mockResolvedValue(user) // User type
orderRepo.findById.mockResolvedValue(order) // Order type
```

## Mock Implementations

### Return Values

```typescript
// Single return value
mockFn.mockReturnValue(42)
mockFn.mockResolvedValue(user) // async

// One-time return values
mockFn
  .mockReturnValueOnce(1)
  .mockReturnValueOnce(2)
  .mockReturnValue(3) // default for subsequent calls

// Async one-time values
mockFn
  .mockResolvedValueOnce(user1)
  .mockResolvedValueOnce(user2)
```

### Custom Implementations

```typescript
// Simple logic
mockFn.mockImplementation((x) => x * 2)

// Async logic
mockFn.mockImplementation(async (id) => {
  if (id === '123') return user
  throw new Error('Not found')
})

// Stateful logic
let callCount = 0
mockFn.mockImplementation(() => {
  callCount++
  if (callCount === 1) return 'first'
  if (callCount === 2) return 'second'
  return 'default'
})

// One-time implementation
mockFn.mockImplementationOnce(() => 'once')
```

### Error Throwing

```typescript
// Synchronous errors
mockFn.mockImplementation(() => {
  throw new Error('Something went wrong')
})

// Async errors (rejected promises)
mockFn.mockRejectedValue(new Error('Database error'))

// One-time errors
mockFn
  .mockRejectedValueOnce(new Error('First call fails'))
  .mockResolvedValue(user) // subsequent calls succeed

// Conditional errors
mockFn.mockImplementation(async (id) => {
  if (id === 'invalid') {
    throw new Error('Invalid ID')
  }
  return data
})
```

## Spies

### Spying on Existing Functions

```typescript
import { vi } from 'vitest'
import { emailService } from './email-service'

// Spy without replacing implementation
const sendSpy = vi.spyOn(emailService, 'send')

// Function still works normally
await emailService.send({ to: 'alice@example.com', subject: 'Test' })

// But you can assert on calls
expect(sendSpy).toHaveBeenCalledOnce()
expect(sendSpy).toHaveBeenCalledWith({
  to: 'alice@example.com',
  subject: 'Test',
})

// Temporarily override
sendSpy.mockResolvedValueOnce({ messageId: 'mock-123' })
await emailService.send({ to: 'bob@example.com', subject: 'Test' })
```

### Spying on Object Methods

```typescript
const user = {
  name: 'Alice',
  greet() {
    return `Hello, ${this.name}`
  }
}

const greetSpy = vi.spyOn(user, 'greet')

// Call real method
expect(user.greet()).toBe('Hello, Alice')

// Assert it was called
expect(greetSpy).toHaveBeenCalled()

// Override for specific test
greetSpy.mockReturnValue('Mock greeting')
expect(user.greet()).toBe('Mock greeting')

// Restore original
greetSpy.mockRestore()
expect(user.greet()).toBe('Hello, Alice')
```

### Spying on Constructors

```typescript
class Database {
  constructor(public url: string) {}
  async connect() { /* ... */ }
}

const DatabaseSpy = vi.spyOn(Database.prototype, 'connect')

const db = new Database('postgres://localhost')
await db.connect()

expect(DatabaseSpy).toHaveBeenCalledOnce()
```

## Class Mocking

### Mocking Entire Classes

```typescript
vi.mock('./database', () => {
  return {
    Database: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue([]),
      disconnect: vi.fn().mockResolvedValue(undefined),
    }))
  }
})

import { Database } from './database'

// Database is now a mock constructor
const db = new Database('url')
await db.connect()

expect(Database).toHaveBeenCalledWith('url')
expect(db.connect).toHaveBeenCalled()
```

### Mocking with Class Instances

```typescript
class MockDatabase {
  connect = vi.fn().mockResolvedValue(undefined)
  query = vi.fn().mockResolvedValue([])
  disconnect = vi.fn().mockResolvedValue(undefined)
}

vi.mock('./database', () => ({
  Database: MockDatabase
}))

// Use in tests
const db = new Database()
await db.connect()

expect(db.connect).toHaveBeenCalled()
```

## Dependency Injection Patterns

### Constructor Injection

```typescript
class UserService {
  constructor(
    private repo: UserRepository,
    private email: EmailService,
  ) {}

  async createUser(data: CreateUserInput) {
    const user = await this.repo.save(data)
    await this.email.sendWelcome(user.email)
    return user
  }
}

// Test with mocked dependencies
it('creates user and sends email', async () => {
  const mockRepo = vi.mocked<UserRepository>({
    save: vi.fn().mockResolvedValue(user)
  })

  const mockEmail = vi.mocked<EmailService>({
    sendWelcome: vi.fn().mockResolvedValue(undefined)
  })

  const service = new UserService(mockRepo, mockEmail)
  const result = await service.createUser(userData)

  expect(mockRepo.save).toHaveBeenCalledWith(userData)
  expect(mockEmail.sendWelcome).toHaveBeenCalledWith(user.email)
  expect(result).toEqual(user)
})
```

### Factory Pattern

```typescript
interface Services {
  userRepo: UserRepository
  emailService: EmailService
}

function createUserService(deps: Services) {
  return {
    async createUser(data: CreateUserInput) {
      const user = await deps.userRepo.save(data)
      await deps.emailService.sendWelcome(user.email)
      return user
    }
  }
}

// Test with mocked dependencies
it('creates user with factory', async () => {
  const service = createUserService({
    userRepo: mockRepo,
    emailService: mockEmail,
  })

  await service.createUser(userData)
  expect(mockRepo.save).toHaveBeenCalled()
})
```

## Mock Assertions

### Call Tracking

```typescript
// Called at all
expect(mockFn).toHaveBeenCalled()
expect(mockFn).not.toHaveBeenCalled()

// Call count
expect(mockFn).toHaveBeenCalledTimes(3)
expect(mockFn).toHaveBeenCalledOnce()

// Call arguments
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
expect(mockFn).toHaveBeenLastCalledWith('arg1', 'arg2')
expect(mockFn).toHaveBeenNthCalledWith(2, 'arg1', 'arg2') // second call

// Partial argument matching
expect(mockFn).toHaveBeenCalledWith(
  expect.objectContaining({ id: '123' }),
  expect.any(Number)
)
```

### Call Order

```typescript
const mockA = vi.fn()
const mockB = vi.fn()

mockA('first')
mockB('second')
mockA('third')

// Check call order
expect(mockA.mock.calls[0][0]).toBe('first')
expect(mockB.mock.calls[0][0]).toBe('second')
expect(mockA.mock.calls[1][0]).toBe('third')

// Or use invocationCallOrder
expect(mockA.mock.invocationCallOrder[0]).toBeLessThan(
  mockB.mock.invocationCallOrder[0]
)
```

### Return Values

```typescript
mockFn.mockReturnValue('result')
const result = mockFn()

expect(mockFn).toHaveReturned()
expect(mockFn).toHaveReturnedWith('result')
expect(mockFn).toHaveLastReturnedWith('result')
expect(mockFn).toHaveNthReturnedWith(1, 'result')
```

## Mock State Management

### Resetting Mocks

```typescript
// Clear call history and results, keep implementation
mockFn.mockClear()

// Clear everything, reset to no implementation
mockFn.mockReset()

// Reset and restore to original implementation (for spies)
spyFn.mockRestore()

// In tests
beforeEach(() => {
  vi.clearAllMocks() // Clear all mocks
  // or
  vi.resetAllMocks() // Reset all mocks
})

afterAll(() => {
  vi.restoreAllMocks() // Restore all spies
})
```

### Mock State Inspection

```typescript
mockFn('arg1', 'arg2')
mockFn('arg3', 'arg4')

// Access mock state
console.log(mockFn.mock.calls) // [['arg1', 'arg2'], ['arg3', 'arg4']]
console.log(mockFn.mock.results) // [{ type: 'return', value: ... }]
console.log(mockFn.mock.lastCall) // ['arg3', 'arg4']
console.log(mockFn.mock.calls.length) // 2

// Check if it's a mock
expect(vi.isMockFunction(mockFn)).toBe(true)
```

## Global Mocks

### Mocking Global Objects

```typescript
// Mock global fetch
global.fetch = vi.fn()

// Type-safe global mock
global.fetch = vi.fn<typeof fetch>()

global.fetch.mockResolvedValue({
  ok: true,
  json: async () => ({ data: 'response' })
} as Response)

// In test
const data = await fetch('/api/users')
expect(global.fetch).toHaveBeenCalledWith('/api/users')
```

### Mocking Environment Variables

```typescript
import { beforeEach, afterEach } from 'vitest'

let originalEnv: NodeJS.ProcessEnv

beforeEach(() => {
  originalEnv = process.env
  process.env = { ...originalEnv, NODE_ENV: 'test' }
})

afterEach(() => {
  process.env = originalEnv
})

it('uses test environment', () => {
  expect(process.env.NODE_ENV).toBe('test')
})
```

### Mocking Timers

```typescript
import { vi } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('executes after delay', async () => {
  const callback = vi.fn()

  setTimeout(callback, 1000)

  // Time hasn't passed yet
  expect(callback).not.toHaveBeenCalled()

  // Advance time
  vi.advanceTimersByTime(1000)

  expect(callback).toHaveBeenCalled()
})

it('runs all timers', async () => {
  const callback = vi.fn()

  setTimeout(callback, 1000)
  setTimeout(callback, 2000)

  vi.runAllTimers()

  expect(callback).toHaveBeenCalledTimes(2)
})
```

## Advanced Patterns

### Mocking Chains

```typescript
const mockBuilder = {
  select: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue([user]),
}

// Chainable API
const result = await mockBuilder
  .select(['id', 'name'])
  .where({ active: true })
  .limit(10)
  .execute()

expect(mockBuilder.select).toHaveBeenCalledWith(['id', 'name'])
expect(mockBuilder.where).toHaveBeenCalledWith({ active: true })
expect(mockBuilder.limit).toHaveBeenCalledWith(10)
expect(result).toEqual([user])
```

### Mock Generators

```typescript
function* numberGenerator() {
  yield 1
  yield 2
  yield 3
}

const mockGen = vi.fn(numberGenerator)

const gen = mockGen()
expect(gen.next().value).toBe(1)
expect(gen.next().value).toBe(2)

expect(mockGen).toHaveBeenCalledOnce()
```

### Async Iterators

```typescript
async function* asyncGenerator() {
  yield 'a'
  yield 'b'
}

const mockAsyncGen = vi.fn(asyncGenerator)

const gen = mockAsyncGen()
expect((await gen.next()).value).toBe('a')
expect((await gen.next()).value).toBe('b')
```

## Guidelines

1. **Use `vi.mocked<T>()` for type safety** - Ensures mocks match interface contracts
2. **Mock at module boundaries** - Mock external dependencies, not internal functions
3. **Prefer dependency injection** - Makes testing easier and code more flexible
4. **Clear mocks between tests** - Use `beforeEach(() => vi.clearAllMocks())`
5. **Use spies for real implementations** - When you need to verify calls but keep behavior
6. **One mock setup per test** - Avoid shared mock state across tests
7. **Explicit return values** - Set up mock returns explicitly, don't rely on defaults
8. **Test both success and failure** - Mock both resolved and rejected scenarios
9. **Verify call order when critical** - Use `mock.invocationCallOrder` for sequence testing
10. **Restore spies after tests** - Use `afterAll(() => vi.restoreAllMocks())`
11. **Use fake timers for time-based code** - More reliable than real delays
12. **Mock at the right level** - HTTP layer (MSW) vs module layer vs function layer

## Common Pitfalls

### Don't Mock What You Don't Own

```typescript
// BAD - mocking third-party library internals
vi.mock('express', () => ({
  Router: vi.fn() // fragile, breaks on updates
}))

// GOOD - create abstraction and mock that
interface HttpRouter {
  get(path: string, handler: Function): void
  post(path: string, handler: Function): void
}

const mockRouter = vi.mocked<HttpRouter>({
  get: vi.fn(),
  post: vi.fn(),
})
```

### Avoid Over-Mocking

```typescript
// BAD - mocking everything
const mockUserService = {
  create: vi.fn(),
  validate: vi.fn(),
  format: vi.fn(),
  serialize: vi.fn(),
}

// GOOD - mock external dependencies only
const mockUserRepo = vi.mocked<UserRepository>({
  save: vi.fn()
})

const userService = new UserService(mockUserRepo) // test real logic
```

### Reset Mock State

```typescript
// BAD - shared mock state
const mockFn = vi.fn()

it('test 1', () => {
  mockFn('arg1')
  expect(mockFn).toHaveBeenCalledOnce()
})

it('test 2', () => {
  // FAILS - mockFn still has call from test 1
  expect(mockFn).not.toHaveBeenCalled()
})

// GOOD - clear between tests
beforeEach(() => {
  vi.clearAllMocks()
})
```
