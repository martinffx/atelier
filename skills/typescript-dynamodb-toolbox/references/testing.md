# Testing Patterns for DynamoDB

Comprehensive testing strategies for DynamoDB repositories using DynamoDB Local and Jest.

## Test Architecture

### Three Testing Layers

1. **Repository Tests** - Data access, CRUD, queries, transactions
2. **Service Tests** - Business logic, orchestration
3. **Router Tests** - HTTP handling, validation, error responses

**Do NOT test:**
- Entity transformations in isolation (tested through Repository layer)
- Schema definitions (validated by DynamoDB Toolbox)

### Why This Approach?

- **Repository tests** verify DynamoDB operations work correctly
- **Entity transformations** tested implicitly (full round-trip)
- **Service tests** verify business logic without database overhead
- **Router tests** verify HTTP layer without business logic

## DynamoDB Local Setup

### Installation

```bash
# Using Docker (recommended)
docker pull amazon/dynamodb-local

# Run DynamoDB Local
docker run -p 8000:8000 amazon/dynamodb-local
```

**Or use docker-compose:**

```yaml
# docker-compose.yml
version: '3.8'
services:
  dynamodb-local:
    image: amazon/dynamodb-local
    ports:
      - "8000:8000"
    command: ["-jar", "DynamoDBLocal.jar", "-sharedDb", "-inMemory"]
```

### Test Configuration

```typescript
// src/test/config.ts
export const testConfig = {
  database: {
    endpoint: "http://localhost:8000",
    region: "local",
    credentials: {
      accessKeyId: "dummy",
      secretAccessKey: "dummy",
    },
    tableName: "test-github-table",
  },
}
```

### Test Setup Pattern

```typescript
import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb"
import { createTableParams, initializeSchema } from "./schema"

describe("UserRepository", () => {
  let client: DynamoDBClient
  let userRepo: UserRepository

  // Unique ID per test run for isolation
  const testRunId = Date.now()
  const testUsername = `testuser-${testRunId}`

  beforeAll(async () => {
    // 1. Initialize DynamoDB client
    client = new DynamoDBClient({
      endpoint: testConfig.database.endpoint,
      region: testConfig.database.region,
      credentials: testConfig.database.credentials,
    })

    // 2. Create unique table for this test suite
    const tableName = `test-user-repo-${testRunId}`
    await client.send(new CreateTableCommand(createTableParams(tableName)))

    // 3. Initialize schema with table name
    const schema = initializeSchema(tableName, client)

    // 4. Initialize repository
    userRepo = new UserRepository(schema.user)
  }, 15000) // 15s timeout for table creation

  afterAll(async () => {
    // Cleanup client connection
    client.destroy()
  })

  // Tests...
})
```

**Key Points:**
- Use unique table names per test suite (prevents collisions)
- Use 15s timeout for `beforeAll` (table creation is slow)
- Clean up client in `afterAll`
- Don't delete table (in-memory or cleaned by DynamoDB Local restart)

## Fixture Factories

### Entity Factory Pattern

```typescript
// src/services/entities/fixtures.ts

let userCounter = 0

export function createUserEntity(
  overrides: Partial<UserEntityOpts> = {}
): UserEntity {
  const count = ++userCounter
  return new UserEntity({
    username: `testuser${count}`,
    email: `test${count}@example.com`,
    bio: "Test user bio",
    ...overrides,  // Allow customization
  })
}

let repoCounter = 0

export function createRepoEntity(
  overrides: Partial<RepositoryEntityOpts> = {}
): RepositoryEntity {
  const count = ++repoCounter
  return new RepositoryEntity({
    owner: "testowner",
    repoName: `repo${count}`,
    description: "Test repository",
    isPrivate: false,
    ...overrides,
  })
}
```

**Usage in tests:**

```typescript
it("should create user", async () => {
  const user = createUserEntity({
    username: "alice",  // Override username
  })

  const created = await userRepo.create(user)

  expect(created.username).toBe("alice")
  expect(created.email).toBe(user.email)

  // Cleanup
  await userRepo.delete(user.username)
})
```

### Shared DynamoDB Client

```typescript
// src/test/helpers.ts

let client: DynamoDBClient | undefined

export async function getDDBClient(): Promise<DynamoDBClient> {
  if (!client) {
    client = new DynamoDBClient({
      endpoint: testConfig.database.endpoint,
      region: testConfig.database.region,
      credentials: testConfig.database.credentials,
    })
  }
  return client
}

export async function cleanupDDBClient(): Promise<void> {
  if (client !== undefined) {
    client.destroy()
    client = undefined
  }
}
```

## CRUD Operation Tests

### Create Tests

```typescript
describe("create", () => {
  it("should create user successfully", async () => {
    const user = createUserEntity()

    const created = await userRepo.create(user)

    expect(created.username).toBe(user.username)
    expect(created.email).toBe(user.email)
    expect(created.created).toBeDefined()
    expect(created.modified).toBeDefined()

    // Cleanup
    await userRepo.delete(user.username)
  })

  it("should throw DuplicateEntityError for duplicate username", async () => {
    const user = createUserEntity({ username: "duplicate" })

    await userRepo.create(user)

    await expect(userRepo.create(user)).rejects.toThrow(DuplicateEntityError)
    await expect(userRepo.create(user)).rejects.toThrow("already exists")

    // Cleanup
    await userRepo.delete(user.username)
  })
})
```

### Read Tests

```typescript
describe("get", () => {
  it("should return user when exists", async () => {
    const user = createUserEntity()
    await userRepo.create(user)

    const retrieved = await userRepo.get(user.username)

    expect(retrieved).toBeDefined()
    expect(retrieved?.username).toBe(user.username)

    // Cleanup
    await userRepo.delete(user.username)
  })

  it("should return undefined when not found", async () => {
    const retrieved = await userRepo.get("nonexistent")

    expect(retrieved).toBeUndefined()
  })
})
```

### Update Tests

```typescript
describe("update", () => {
  it("should update user successfully", async () => {
    const user = createUserEntity()
    await userRepo.create(user)

    const updated = user.updateUser({
      email: "newemail@example.com",
    })

    const result = await userRepo.update(updated)

    expect(result.email).toBe("newemail@example.com")
    expect(result.username).toBe(user.username)

    // Cleanup
    await userRepo.delete(user.username)
  })

  it("should throw EntityNotFoundError when updating non-existent user", async () => {
    const user = createUserEntity({ username: "nonexistent" })

    await expect(userRepo.update(user)).rejects.toThrow(EntityNotFoundError)
    await expect(userRepo.update(user)).rejects.toThrow("not found")
  })
})
```

### Delete Tests

```typescript
describe("delete", () => {
  it("should delete user successfully", async () => {
    const user = createUserEntity()
    await userRepo.create(user)

    await userRepo.delete(user.username)

    const retrieved = await userRepo.get(user.username)
    expect(retrieved).toBeUndefined()
  })

  it("should succeed silently when deleting non-existent user", async () => {
    await expect(
      userRepo.delete("nonexistent")
    ).resolves.not.toThrow()
  })
})
```

## Query and Pagination Tests

### Basic Query Test

```typescript
describe("listByOwner", () => {
  it("should return all repos for owner", async () => {
    const user = createUserEntity({ username: "alice" })
    await userRepo.create(user)

    const repo1 = createRepoEntity({ owner: "alice", repoName: "repo1" })
    const repo2 = createRepoEntity({ owner: "alice", repoName: "repo2" })

    await repoRepo.create(repo1)
    await repoRepo.create(repo2)

    const result = await repoRepo.listByOwner("alice")

    expect(result.items).toHaveLength(2)
    expect(result.items.map(r => r.repoName)).toContain("repo1")
    expect(result.items.map(r => r.repoName)).toContain("repo2")

    // Cleanup
    await repoRepo.delete("alice", "repo1")
    await repoRepo.delete("alice", "repo2")
    await userRepo.delete("alice")
  })
})
```

### Pagination Test

```typescript
describe("pagination", () => {
  it("should paginate results correctly", async () => {
    const user = createUserEntity({ username: "alice" })
    await userRepo.create(user)

    // Create 5 repos
    for (let i = 1; i <= 5; i++) {
      const repo = createRepoEntity({
        owner: "alice",
        repoName: `repo${i}`,
      })
      await repoRepo.create(repo)
    }

    // First page (limit 2)
    const page1 = await repoRepo.listByOwner("alice", 2)
    expect(page1.items).toHaveLength(2)
    expect(page1.offset).toBeDefined()

    // Second page
    const page2 = await repoRepo.listByOwner("alice", 2, page1.offset)
    expect(page2.items).toHaveLength(2)
    expect(page2.offset).toBeDefined()

    // Third page (last page)
    const page3 = await repoRepo.listByOwner("alice", 2, page2.offset)
    expect(page3.items).toHaveLength(1)
    expect(page3.offset).toBeUndefined()  // No more pages

    // Cleanup
    for (let i = 1; i <= 5; i++) {
      await repoRepo.delete("alice", `repo${i}`)
    }
    await userRepo.delete("alice")
  })
})
```

### Temporal Sorting Test

```typescript
describe("temporal sorting", () => {
  it("should return repos in newest-first order", async () => {
    const user = createUserEntity({ username: "alice" })
    await userRepo.create(user)

    // Create repos with delays to ensure different timestamps
    const repo1 = createRepoEntity({ owner: "alice", repoName: "old" })
    await repoRepo.create(repo1)

    // Wait 100ms
    await new Promise(resolve => setTimeout(resolve, 100))

    const repo2 = createRepoEntity({ owner: "alice", repoName: "new" })
    await repoRepo.create(repo2)

    const result = await repoRepo.listByOwner("alice")

    expect(result.items).toHaveLength(2)
    expect(result.items[0].repoName).toBe("new")  // Newest first
    expect(result.items[1].repoName).toBe("old")

    // Verify timestamps
    expect(result.items[0].modified.toMillis()).toBeGreaterThan(
      result.items[1].modified.toMillis()
    )

    // Cleanup
    await repoRepo.delete("alice", "old")
    await repoRepo.delete("alice", "new")
    await userRepo.delete("alice")
  })
})
```

## Concurrency Tests

### Atomic Counter Test

```typescript
describe("atomic counter", () => {
  it("should handle concurrent increments without duplicates", async () => {
    const orgId = "testorg"
    const repoId = "testrepo"

    // Execute 5 increments in parallel
    const increments = Array.from({ length: 5 }, () =>
      counterRepo.incrementAndGet(orgId, repoId)
    )

    const results = await Promise.all(increments)

    // All results should be unique
    const uniqueResults = new Set(results)
    expect(uniqueResults.size).toBe(5)

    // Results should be 1, 2, 3, 4, 5 (order may vary)
    expect(results.sort()).toEqual([1, 2, 3, 4, 5])
  })
})
```

### Concurrent Issue Creation Test

```typescript
describe("concurrent issue creation", () => {
  it("should assign unique sequential numbers", async () => {
    const user = createUserEntity({ username: "alice" })
    await userRepo.create(user)

    const repo = createRepoEntity({ owner: "alice", repoName: "test" })
    await repoRepo.create(repo)

    // Create 5 issues concurrently
    const issues = Array.from({ length: 5 }, (_, i) =>
      IssueEntity.fromRequest({
        owner: "alice",
        repo_name: "test",
        title: `Concurrent Issue ${i}`,
        author: "alice",
      })
    )

    const created = await Promise.all(
      issues.map(issue => issueRepo.create(issue))
    )

    // All should have unique numbers
    const numbers = created.map(i => i.issueNumber)
    const uniqueNumbers = new Set(numbers)
    expect(uniqueNumbers.size).toBe(5)

    // Numbers should be sequential (1, 2, 3, 4, 5)
    expect(numbers.sort()).toEqual([1, 2, 3, 4, 5])

    // Cleanup
    for (const issue of created) {
      await issueRepo.delete(issue.owner, issue.repoName, issue.issueNumber)
    }
    await repoRepo.delete("alice", "test")
    await userRepo.delete("alice")
  })
})
```

## Transaction Tests

### Parent Validation Test

```typescript
describe("transaction validation", () => {
  it("should throw EntityNotFoundError when creating issue for non-existent repo", async () => {
    const issue = IssueEntity.fromRequest({
      owner: "alice",
      repo_name: "nonexistent",
      title: "Test Issue",
      author: "alice",
    })

    await expect(issueRepo.create(issue)).rejects.toThrow(EntityNotFoundError)
    await expect(issueRepo.create(issue)).rejects.toThrow("RepositoryEntity")
  })

  it("should create issue when repo exists", async () => {
    const user = createUserEntity({ username: "alice" })
    await userRepo.create(user)

    const repo = createRepoEntity({ owner: "alice", repoName: "test" })
    await repoRepo.create(repo)

    const issue = IssueEntity.fromRequest({
      owner: "alice",
      repo_name: "test",
      title: "Test Issue",
      author: "alice",
    })

    const created = await issueRepo.create(issue)

    expect(created.issueNumber).toBe(1)
    expect(created.title).toBe("Test Issue")

    // Cleanup
    await issueRepo.delete("alice", "test", 1)
    await repoRepo.delete("alice", "test")
    await userRepo.delete("alice")
  })
})
```

## Test Isolation

### Unique Test IDs

```typescript
// Use timestamps for unique IDs
const testRunId = Date.now()
const username = `testuser-${testRunId}`

// Or use counters
let testCounter = 0
const getUniqueUsername = () => `testuser-${++testCounter}`
```

### Cleanup Pattern

```typescript
describe("UserRepository", () => {
  const createdUsers: string[] = []

  afterEach(async () => {
    // Clean up all created users after each test
    for (const username of createdUsers) {
      await userRepo.delete(username).catch(() => {})  // Ignore errors
    }
    createdUsers.length = 0  // Clear array
  })

  it("should create user", async () => {
    const user = createUserEntity()
    createdUsers.push(user.username)  // Track for cleanup

    const created = await userRepo.create(user)

    expect(created.username).toBe(user.username)
  })
})
```

## Error Handling Tests

### Duplicate Entity Test

```typescript
it("should throw DuplicateEntityError", async () => {
  const user = createUserEntity({ username: "duplicate" })

  await userRepo.create(user)

  await expect(userRepo.create(user)).rejects.toThrow(DuplicateEntityError)
  await expect(userRepo.create(user)).rejects.toThrow("already exists")
  await expect(userRepo.create(user)).rejects.toMatchObject({
    entityType: "UserEntity",
    entityKey: "duplicate",
  })

  await userRepo.delete("duplicate")
})
```

### Not Found Test

```typescript
it("should throw EntityNotFoundError", async () => {
  const user = createUserEntity({ username: "nonexistent" })

  await expect(userRepo.update(user)).rejects.toThrow(EntityNotFoundError)
  await expect(userRepo.update(user)).rejects.toThrow("not found")
})
```

## Test Organization Best Practices

### ✓ Do

- Use DynamoDB Local for development/CI
- Create unique table per test suite
- Use fixture factories for test data
- Clean up created entities after tests
- Test error paths explicitly
- Use unique IDs per test run
- Test pagination and sorting
- Test concurrent operations
- Use 15s timeout for `beforeAll`

### ✗ Don't

- Don't test entity transformations in isolation
- Don't skip cleanup (causes test pollution)
- Don't use shared test data across tests
- Don't test schema definitions (trust DynamoDB Toolbox)
- Don't use production DynamoDB for tests
- Don't rely on test execution order

## Testing Checklist

For each repository:

- [ ] **CRUD tests** - Create, read, update, delete
- [ ] **Error tests** - Duplicate, not found, validation
- [ ] **Query tests** - Main table and GSI queries
- [ ] **Pagination tests** - Multiple pages, last page
- [ ] **Sorting tests** - Temporal or status-based sorting
- [ ] **Concurrency tests** - Atomic operations, race conditions
- [ ] **Transaction tests** - Parent validation, multi-entity
- [ ] **Cleanup** - Delete all created test data
- [ ] **Isolation** - Unique IDs, independent tests

## Example: Complete Test Suite

```typescript
import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb"
import { createTableParams, initializeSchema } from "./schema"
import { createUserEntity } from "./fixtures"

describe("UserRepository", () => {
  let client: DynamoDBClient
  let userRepo: UserRepository
  const testRunId = Date.now()
  const createdUsers: string[] = []

  beforeAll(async () => {
    client = new DynamoDBClient({
      endpoint: "http://localhost:8000",
      region: "local",
      credentials: { accessKeyId: "dummy", secretAccessKey: "dummy" },
    })

    const tableName = `test-user-repo-${testRunId}`
    await client.send(new CreateTableCommand(createTableParams(tableName)))

    const schema = initializeSchema(tableName, client)
    userRepo = new UserRepository(schema.user)
  }, 15000)

  afterAll(async () => {
    client.destroy()
  })

  afterEach(async () => {
    for (const username of createdUsers) {
      await userRepo.delete(username).catch(() => {})
    }
    createdUsers.length = 0
  })

  describe("create", () => {
    it("should create user successfully", async () => {
      const user = createUserEntity()
      createdUsers.push(user.username)

      const created = await userRepo.create(user)

      expect(created.username).toBe(user.username)
      expect(created.email).toBe(user.email)
    })

    it("should throw DuplicateEntityError", async () => {
      const user = createUserEntity({ username: "duplicate" })
      createdUsers.push(user.username)

      await userRepo.create(user)

      await expect(userRepo.create(user)).rejects.toThrow(DuplicateEntityError)
    })
  })

  describe("get", () => {
    it("should return user when exists", async () => {
      const user = createUserEntity()
      createdUsers.push(user.username)

      await userRepo.create(user)

      const retrieved = await userRepo.get(user.username)

      expect(retrieved).toBeDefined()
      expect(retrieved?.username).toBe(user.username)
    })

    it("should return undefined when not found", async () => {
      const retrieved = await userRepo.get("nonexistent")

      expect(retrieved).toBeUndefined()
    })
  })

  // ... more tests
})
```
