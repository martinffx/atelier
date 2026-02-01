# Repository Layer Patterns

The repository layer encapsulates all DynamoDB operations, providing a clean interface between domain entities and the database.

## Repository Responsibilities

**What Repositories Do:**
- Execute DynamoDB commands (Get, Put, Update, Delete, Query, Scan)
- Enforce business constraints via conditional writes
- Handle pagination and filtering
- Convert between DynamoDB records and domain entities
- Map DynamoDB errors to domain errors

**What Repositories Don't Do:**
- Business logic (belongs in Service layer)
- Entity transformations (handled by Entity classes)
- HTTP request/response handling (belongs in Router layer)
- Direct attribute manipulation (use Entity methods)

## Constructor Patterns

### Single Entity Repository

For simple CRUD operations on one entity type.

```typescript
import { type UserRecord } from './schema'

class UserRepository {
  constructor(private readonly entity: UserRecord) {}

  async get(username: string): Promise<UserEntity | undefined> {
    const result = await this.entity
      .build(GetItemCommand)
      .key({ username })
      .send()

    return result.Item ? UserEntity.fromRecord(result.Item) : undefined
  }
}
```

**When to use:**
- Entity has no dependencies on other entities
- All operations are simple CRUD
- No transaction validation needed

### Multi-Entity Repository

For operations requiring validation or queries across entities.

```typescript
import { type Table } from 'dynamodb-toolbox/table'
import { type IssueRecord, type RepoRecord, type CounterRecord } from './schema'

class IssueRepository {
  constructor(
    private readonly table: Table,
    private readonly issueRecord: IssueRecord,
    private readonly counterRecord: CounterRecord,
    private readonly repoRecord: RepoRecord
  ) {}

  async create(issue: IssueEntity): Promise<IssueEntity> {
    // Uses counterRecord to generate issue number
    // Uses repoRecord to validate parent exists
    // Uses table to execute cross-entity queries
  }
}
```

**When to use:**
- Need to validate foreign keys (transactions)
- Need to query related entities
- Need atomic counters for sequential IDs
- Need to query GSIs with multiple entity types

**Key Point:** Pass `Table` instance for cross-entity queries, individual `Entity` instances for specific operations.

## CRUD Operations

### Create with Duplicate Prevention

```typescript
import { PutItemCommand } from 'dynamodb-toolbox'
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'

async create(user: UserEntity): Promise<UserEntity> {
  try {
    const result = await this.entity
      .build(PutItemCommand)
      .item(user.toRecord())
      .options({
        condition: { attr: "PK", exists: false }  // Prevent duplicates
      })
      .send()

    return UserEntity.fromRecord(result.ToolboxItem)
  } catch (error: unknown) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new DuplicateEntityError("UserEntity", user.username)
    }
    throw error
  }
}
```

**Key Points:**
- Use `PutItemCommand` (replaces entire item)
- Condition: `{ attr: "PK", exists: false }`
- Return entity from `result.ToolboxItem`
- Map `ConditionalCheckFailedException` to `DuplicateEntityError`

### Read by Primary Key

```typescript
import { GetItemCommand } from 'dynamodb-toolbox'

async get(username: string): Promise<UserEntity | undefined> {
  const result = await this.entity
    .build(GetItemCommand)
    .key({ username })  // Provide key attributes only
    .send()

  return result.Item ? UserEntity.fromRecord(result.Item) : undefined
}
```

**Key Points:**
- Use `GetItemCommand`
- Pass only key attributes to `.key()`
- Return `undefined` if not found (don't throw)
- Always convert via `Entity.fromRecord()`

### Update with Existence Check

```typescript
async update(user: UserEntity): Promise<UserEntity> {
  try {
    const result = await this.entity
      .build(PutItemCommand)
      .item(user.toRecord())
      .options({
        condition: { attr: "PK", exists: true }  // Must exist
      })
      .send()

    return UserEntity.fromRecord(result.ToolboxItem)
  } catch (error: unknown) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new EntityNotFoundError("UserEntity", user.username)
    }
    throw error
  }
}
```

**Key Points:**
- Use `PutItemCommand` (replaces entire item)
- Condition: `{ attr: "PK", exists: true }`
- Map `ConditionalCheckFailedException` to `EntityNotFoundError`

### Delete

```typescript
import { DeleteItemCommand } from 'dynamodb-toolbox'

async delete(username: string): Promise<void> {
  await this.entity
    .build(DeleteItemCommand)
    .key({ username })
    .send()

  // No return value - succeeds silently even if item doesn't exist
}
```

**Key Points:**
- Use `DeleteItemCommand`
- No condition needed (idempotent by default)
- Add condition if you need to verify existence

## UpdateItemCommand vs PutItemCommand

### Use PutItemCommand (Replace Entire Item)

```typescript
// Replace entire item with entity state
await this.entity
  .build(PutItemCommand)
  .item(user.toRecord())  // Full entity
  .options({ condition: { attr: "PK", exists: true } })
  .send()
```

**When to use:**
- Creating entities (with `exists: false`)
- Updating entities (with `exists: true`)
- Working with Entity objects (full state)
- Need to replace entire item

**Pros:**
- Works with Entity pattern (full state)
- Simple and predictable
- Matches domain model

**Cons:**
- Replaces entire item (not partial update)

### Use UpdateItemCommand (Partial Update)

```typescript
import { UpdateItemCommand, $add } from 'dynamodb-toolbox'

// Atomic counter increment
await this.entity
  .build(UpdateItemCommand)
  .item({
    org_id: orgId,
    repo_id: repoId,
    current_value: $add(1),  // Only update this field
  })
  .options({ returnValues: "ALL_NEW" })
  .send()
```

**When to use:**
- Atomic operations (`$add`, `$subtract`, `$append`)
- Partial updates without loading full entity
- Updating single attributes
- Counter increments

**Atomic Update Operators:**
- `$add(n)` - Add to number (creates with n if doesn't exist)
- `$subtract(n)` - Subtract from number
- `$append([items])` - Append to list
- `$remove()` - Remove attribute

**Pros:**
- Atomic operations (no race conditions)
- Efficient (don't need to load entity first)
- Can return updated values

**Cons:**
- Doesn't work with full Entity objects
- More complex API
- Bypasses entity validation

**Best Practice:** Use `PutItemCommand` for entity-based operations, `UpdateItemCommand` for atomic operations.

## Query Patterns

### Query Main Table by Partition Key

```typescript
async listByPartition(username: string): Promise<Star[]> {
  const result = await this.table
    .build(QueryCommand)
    .entities(this.starRecord)  // Type-safe formatting
    .query({
      partition: `ACCOUNT#${username}`,
    })
    .send()

  return result.Items?.map(item => StarEntity.fromRecord(item)) || []
}
```

**Key Points:**
- Use `Table.build(QueryCommand)` for queries
- Use `.entities(this.record)` for type-safe attribute mapping
- Specify partition key value
- All items with that partition key returned

### Query GSI

```typescript
async listByRepo(owner: string, repoName: string): Promise<Issue[]> {
  const result = await this.table
    .build(QueryCommand)
    .entities(this.issueRecord)
    .query({
      partition: `ISSUE#${owner}#${repoName}`,
      index: "GSI1",  // Specify GSI name
    })
    .send()

  return result.Items?.map(item => IssueEntity.fromRecord(item)) || []
}
```

**Key Points:**
- Specify `index: "GSI1"`
- Query GSI partition key (GSI1PK)
- Returns all items in that partition

### Query with Range Key Filter

```typescript
async listComments(
  owner: string,
  repoName: string,
  issueNumber: number
): Promise<Comment[]> {
  const paddedNumber = String(issueNumber).padStart(8, "0")

  const result = await this.table
    .build(QueryCommand)
    .entities(this.commentRecord)
    .query({
      partition: `REPO#${owner}#${repoName}`,
      range: {
        beginsWith: `ISSUE#${paddedNumber}#COMMENT#`
      }
    })
    .send()

  return result.Items?.map(item => CommentEntity.fromRecord(item)) || []
}
```

**Range Key Operators:**
- `beginsWith: "prefix"` - SK starts with prefix
- `between: ["start", "end"]` - SK between values
- `gt: "value"` - SK greater than
- `gte: "value"` - SK greater than or equal
- `lt: "value"` - SK less than
- `lte: "value"` - SK less than or equal

### Query with Status Filter (Smart SK Design)

```typescript
async listOpenIssues(owner: string, repoName: string): Promise<Issue[]> {
  const result = await this.table
    .build(QueryCommand)
    .entities(this.issueRecord)
    .query({
      partition: `ISSUE#${owner}#${repoName}`,
      index: "GSI4",
      range: {
        beginsWith: "ISSUE#OPEN#"  // Filters to open issues only
      }
    })
    .send()

  return result.Items?.map(item => IssueEntity.fromRecord(item)) || []
}
```

**Pattern:** Encode status in GSI sort key for efficient filtering.

## Pagination

### Pagination Helper Functions

```typescript
// Encode LastEvaluatedKey as opaque token
function encodePageToken(
  lastEvaluated?: Record<string, unknown>
): string | undefined {
  return lastEvaluated
    ? Buffer.from(JSON.stringify(lastEvaluated)).toString("base64")
    : undefined
}

// Decode token back to LastEvaluatedKey
function decodePageToken(
  token?: string
): Record<string, unknown> | undefined {
  return token
    ? JSON.parse(Buffer.from(token, "base64").toString())
    : undefined
}
```

### Paginated Query

```typescript
interface PaginatedResponse<T> {
  items: T[]
  nextOffset?: string
}

async listReposByOwner(
  owner: string,
  limit = 50,
  offset?: string
): Promise<PaginatedResponse<RepositoryEntity>> {
  const result = await this.table
    .build(QueryCommand)
    .entities(this.repoRecord)
    .query({
      partition: `ACCOUNT#${owner}`,
      index: "GSI3",
      range: { lt: "ACCOUNT#" },  // Filter repos only
    })
    .options({
      reverse: true,                              // Newest first
      exclusiveStartKey: decodePageToken(offset), // Continue from cursor
      limit,                                      // Page size
    })
    .send()

  return {
    items: result.Items?.map(item =>
      RepositoryEntity.fromRecord(item)
    ) || [],
    nextOffset: encodePageToken(result.LastEvaluatedKey),
  }
}
```

**Key Points:**
- Use `exclusiveStartKey` to continue from previous page
- Use `limit` to control page size
- Encode `LastEvaluatedKey` as opaque token for clients
- Use `reverse: true` for descending order

**Client Usage:**
```typescript
// First page
const page1 = await repo.listReposByOwner("alice", 10)

// Next page
const page2 = await repo.listReposByOwner("alice", 10, page1.nextOffset)

// Continue until nextOffset is undefined
```

## Table.build vs Entity.build

### Entity.build (Single Entity Operations)

```typescript
// Use Entity.build for operations on single entity type
const result = await this.entity
  .build(GetItemCommand)
  .key({ username })
  .send()
```

**Commands:**
- `GetItemCommand` - Read single item
- `PutItemCommand` - Create/update item
- `UpdateItemCommand` - Partial update
- `DeleteItemCommand` - Delete item
- `PutTransaction` - Transaction put
- `ConditionCheck` - Transaction condition

### Table.build (Multi-Entity Queries)

```typescript
// Use Table.build for queries across multiple entity types
const result = await this.table
  .build(QueryCommand)
  .entities(this.issueRecord)  // Specify which entity type
  .query({ partition: "ISSUE#..." })
  .send()
```

**Commands:**
- `QueryCommand` - Query partition
- `ScanCommand` - Full table scan (avoid in production)

**Critical:** Always use `.entities(this.record)` when querying table to ensure proper attribute mapping from raw DynamoDB names (`_ct`, `_md`) to entity names (`created`, `modified`).

## Type-Safe Queries with .entities()

### Without .entities() (Raw DynamoDB Attributes)

```typescript
// ❌ WRONG - Returns raw DynamoDB attributes
const result = await this.table
  .build(QueryCommand)
  .query({ partition: "ACCOUNT#alice" })
  .send()

// result.Items has _ct and _md instead of created and modified
```

### With .entities() (Formatted Attributes)

```typescript
// ✓ RIGHT - Returns formatted attributes
const result = await this.table
  .build(QueryCommand)
  .entities(this.userRecord)  // Formats through entity schema
  .query({ partition: "ACCOUNT#alice" })
  .send()

// result.Items has created and modified (properly formatted)
```

**Rule:** Always use `.entities()` when querying Table to get type-safe, formatted results.

## Common Patterns from gh-ddb

### Pattern: List Collection by Parent

```typescript
// List all issues for a repository
async list(owner: string, repoName: string): Promise<IssueEntity[]> {
  const result = await this.table
    .build(QueryCommand)
    .entities(this.issueRecord)
    .query({
      partition: `ISSUE#${owner}#${repoName}`,
      index: "GSI1",
    })
    .send()

  return result.Items?.map(item => IssueEntity.fromRecord(item)) || []
}
```

### Pattern: Query with Temporal Sorting

```typescript
// List repos by owner, newest first
async listByOwner(
  owner: string,
  options: ListOptions = {}
): Promise<PaginatedResponse<RepositoryEntity>> {
  const { limit = 50, offset } = options

  const result = await this.table
    .build(QueryCommand)
    .entities(this.repoRecord)
    .query({
      partition: `ACCOUNT#${owner}`,
      index: "GSI3",
      range: { lt: "ACCOUNT#" },  // Exclude account record itself
    })
    .options({
      reverse: true,  // Newest first (GSI3SK has #timestamp)
      exclusiveStartKey: decodePageToken(offset),
      limit,
    })
    .send()

  return {
    items: result.Items?.map(item =>
      RepositoryEntity.fromRecord(item)
    ) || [],
    offset: encodePageToken(result.LastEvaluatedKey),
  }
}
```

### Pattern: Adjacency List Query (Both Directions)

```typescript
// User's starred repos (main table)
async getStarsByUser(username: string): Promise<StarEntity[]> {
  const result = await this.table
    .build(QueryCommand)
    .entities(this.starRecord)
    .query({
      partition: `ACCOUNT#${username}`,
      range: { beginsWith: "STAR#" }
    })
    .send()

  return result.Items?.map(item => StarEntity.fromRecord(item)) || []
}

// Repo's stargazers (GSI1 - inverted)
async getStarsByRepo(
  owner: string,
  repoName: string
): Promise<StarEntity[]> {
  const result = await this.table
    .build(QueryCommand)
    .entities(this.starRecord)
    .query({
      partition: `REPO#${owner}#${repoName}`,
      index: "GSI1",
      range: { beginsWith: "STAR#" }
    })
    .send()

  return result.Items?.map(item => StarEntity.fromRecord(item)) || []
}
```

## Repository Best Practices

### ✓ Do

- Keep repositories focused on their primary entity
- Use conditional writes for create/update
- Always convert via `Entity.fromRecord()`
- Return `undefined` for not found (don't throw on Get)
- Map DynamoDB errors to domain errors
- Use `.entities()` for type-safe queries
- Encode pagination cursors as opaque tokens
- Pass `Table` instance for cross-entity operations

### ✗ Don't

- Don't include business logic (use Service layer)
- Don't return raw DynamoDB records
- Don't query without `.entities()` (loses type safety)
- Don't use Scan in production (performance cost)
- Don't retry blindly on errors (may have partial state)
- Don't expose DynamoDB error details to clients
- Don't create empty Sets (DynamoDB rejects them)

## Repository Testing

See [testing.md](testing.md) for comprehensive testing patterns including:

- DynamoDB Local setup
- CRUD operation tests
- Query and pagination tests
- Concurrency tests
- Error handling tests

## Repository Checklist

For each repository:

- [ ] **Constructor** - Single entity or multi-entity pattern
- [ ] **Create** - PutItemCommand with `exists: false` condition
- [ ] **Get** - GetItemCommand returning `undefined` if not found
- [ ] **Update** - PutItemCommand with `exists: true` condition
- [ ] **Delete** - DeleteItemCommand (idempotent)
- [ ] **Queries** - Use `.entities()` for type-safe results
- [ ] **Pagination** - Encode/decode cursors, return nextOffset
- [ ] **Error Handling** - Map to domain errors
- [ ] **Testing** - Comprehensive tests for all operations
