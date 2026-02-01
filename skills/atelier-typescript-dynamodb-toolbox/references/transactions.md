# Transactions and Atomic Operations

Patterns for multi-entity consistency and atomic counters in DynamoDB.

## Transaction Patterns

### Basic: Create with Parent Validation

Ensure parent entity exists before creating child entity.

**Use Case:** Create an issue only if the repository exists

```typescript
import { PutTransaction } from 'dynamodb-toolbox/entity/actions/transactPut'
import { ConditionCheck } from 'dynamodb-toolbox'
import { execute } from 'dynamodb-toolbox/entity/actions/transactWrite'

async createIssue(issue: IssueEntity): Promise<IssueEntity> {
  try {
    // 1. Build transaction to put issue with duplicate check
    const putIssueTransaction = this.issueRecord
      .build(PutTransaction)
      .item(issue.toRecord())
      .options({
        condition: { attr: "PK", exists: false }  // Prevent duplicates
      })

    // 2. Build condition check to verify repository exists
    const repoCheckTransaction = this.repoRecord
      .build(ConditionCheck)
      .key({
        owner: issue.owner,
        repo_name: issue.repoName,
      })
      .condition({ attr: "PK", exists: true })  // Repo must exist

    // 3. Execute both operations in transaction
    await execute(putIssueTransaction, repoCheckTransaction)

    // 4. Fetch the created item (transaction doesn't return it)
    const created = await this.get(issue.owner, issue.repoName, issue.issueNumber)
    if (!created) {
      throw new Error("Failed to retrieve created issue")
    }

    return created
  } catch (error: unknown) {
    // See error-handling.md for error mapping
    handleTransactionError(error, {
      entityType: "IssueEntity",
      entityKey: issue.getEntityKey(),
      parentEntityType: "RepositoryEntity",
      parentEntityKey: issue.getParentEntityKey(),
    })
  }
}
```

**Key Points:**
- `PutTransaction` creates the new entity
- `ConditionCheck` validates the parent exists
- Both succeed or both fail (atomic)
- Must fetch created item separately

### Advanced: Three-Way Validation

Validate multiple parent entities before creating relationship.

**Use Case:** Create a star only if both user and repository exist

```typescript
async createStar(star: StarEntity): Promise<StarEntity> {
  try {
    // 1. Build transaction to put star
    const putStarTransaction = this.starRecord
      .build(PutTransaction)
      .item(star.toRecord())
      .options({
        condition: { attr: "PK", exists: false }
      })

    // 2. Build condition check to verify user exists
    const userCheck = this.userRecord
      .build(ConditionCheck)
      .key({ username: star.username })
      .condition({ attr: "PK", exists: true })

    // 3. Build condition check to verify repo exists
    const repoCheck = this.repoRecord
      .build(ConditionCheck)
      .key({
        owner: star.repoOwner,
        repo_name: star.repoName,
      })
      .condition({ attr: "PK", exists: true })

    // 4. Execute all three operations
    await execute(putStarTransaction, userCheck, repoCheck)

    // Fetch and return created star
    const created = await this.get(star.username, star.repoOwner, star.repoName)
    if (!created) {
      throw new Error("Failed to retrieve created star")
    }

    return created
  } catch (error: unknown) {
    handleThreeWayTransactionError(error, star)
  }
}
```

**DynamoDB Transaction Limit:** Maximum 100 operations per transaction.

## Atomic Counter Pattern

### Use Case: Sequential Issue/PR Numbering

Each repository needs its own issue counter that increments atomically.

### Counter Schema

```typescript
import { Entity } from 'dynamodb-toolbox/entity'
import { item } from 'dynamodb-toolbox/schema/item'
import { string, number } from 'dynamodb-toolbox/schema'

const CounterRecord = new Entity({
  name: "Counter",
  table: AppTable,
  schema: item({
    org_id: string().required().key(),
    repo_id: string().required().key(),
    current_value: number().required().default(0),
  }).and(_schema => ({
    PK: string().key().link<typeof _schema>(
      ({ org_id, repo_id }) => `COUNTER#${org_id}#${repo_id}`
    ),
    SK: string().key().default("METADATA"),
  })),
})
```

**Key Design:**
- PK: `COUNTER#{org}#{repo}` - One counter per repository
- SK: `METADATA` - Static sort key
- `current_value`: Defaults to 0, increments atomically

### Atomic Increment Implementation

```typescript
import { UpdateItemCommand, $add } from 'dynamodb-toolbox'

class CounterRepository {
  constructor(private entity: CounterRecord) {}

  async incrementAndGet(orgId: string, repoId: string): Promise<number> {
    const result = await this.entity
      .build(UpdateItemCommand)
      .item({
        org_id: orgId,
        repo_id: repoId,
        current_value: $add(1),  // Atomic increment
      })
      .options({
        returnValues: "ALL_NEW"   // Return updated value
      })
      .send()

    if (!result.Attributes?.current_value) {
      throw new Error(
        "Failed to increment counter: invalid response from DynamoDB"
      )
    }

    return result.Attributes.current_value
  }
}
```

**How `$add(1)` Works:**
- If counter doesn't exist: Creates with `current_value = 1`
- If counter exists: Increments `current_value` by 1
- Operation is atomic - no race conditions
- Returns new value in single round-trip

### Usage in Issue Creation

```typescript
async createIssue(issue: IssueEntity): Promise<IssueEntity> {
  // 1. Get next issue number atomically
  const issueNumber = await this.counterRepo.incrementAndGet(
    issue.owner,
    issue.repoName
  )

  // 2. Create issue with assigned number
  const issueWithNumber = new IssueEntity({
    ...issue,
    issueNumber,  // Use atomically generated number
  })

  // 3. Use transaction to ensure repo exists
  try {
    const putIssueTransaction = this.issueRecord
      .build(PutTransaction)
      .item(issueWithNumber.toRecord())
      .options({
        condition: { attr: "PK", exists: false }
      })

    const repoCheckTransaction = this.repoRecord
      .build(ConditionCheck)
      .key({ owner: issue.owner, repo_name: issue.repoName })
      .condition({ attr: "PK", exists: true })

    await execute(putIssueTransaction, repoCheckTransaction)

    return issueWithNumber
  } catch (error: unknown) {
    // Note: Counter was incremented but issue creation failed
    // This creates a gap in issue numbers, which is acceptable
    // (GitHub also has gaps in issue numbers)
    handleTransactionError(error, /* ... */)
  }
}
```

**Gap Handling:**
If transaction fails after counter increment, you get a gap in issue numbers. This is acceptable:
- GitHub has gaps in issue/PR numbers
- Alternative: Pre-allocate batches (more complex)
- Alternative: Use UUIDs instead (loses sequential ordering)

## Concurrent Issue Creation

The atomic counter pattern handles concurrent creation correctly:

```typescript
// Five concurrent requests to create issues in same repo
const issues = Array.from({ length: 5 }, (_, i) =>
  IssueEntity.fromRequest({
    owner: "alice",
    repo_name: "my-repo",
    title: `Concurrent Issue ${i}`,
    author: "testuser",
  })
)

// All five execute in parallel
const created = await Promise.all(
  issues.map(issue => issueRepo.create(issue))
)

// Result: Five unique sequential numbers
// e.g., [1, 2, 3, 4, 5] (order may vary)
const numbers = created.map(i => i.issueNumber)
console.log(new Set(numbers).size === 5)  // true - all unique
```

**DynamoDB Guarantees:**
- Each `$add(1)` operation is atomic
- Concurrent requests get unique sequential numbers
- No duplicates or race conditions

## Other Atomic Operations

### $subtract

```typescript
current_value: $subtract(1)  // Decrement by 1
```

### $append

```typescript
import { $append } from 'dynamodb-toolbox'

history: $append(['2024-01-01: Status changed to closed'])
```

Appends to list attribute. Creates list with value if attribute doesn't exist.

### $remove

```typescript
import { $remove } from 'dynamodb-toolbox'

deprecated_field: $remove()  // Remove attribute entirely
```

## Transaction Error Handling

See [error-handling.md](error-handling.md) for detailed error handling patterns, including:

- Parsing `TransactionCanceledException` CancellationReasons
- Mapping to domain errors (DuplicateEntityError, EntityNotFoundError)
- Distinguishing which operation failed in multi-entity transactions

## Transaction Best Practices

### ✓ Do

- Use transactions for multi-entity consistency
- Use atomic counters for sequential numbering
- Keep transactions small (< 10 operations ideal)
- Accept gaps in sequential numbers
- Use `returnValues: "ALL_NEW"` to get updated values

### ✗ Don't

- Don't use transactions when single PutItem with condition suffices
- Don't create transactions with 50+ operations (performance cost)
- Don't assume transaction returns created item (must fetch separately)
- Don't retry blindly on transaction failure (may have partial state)

## Performance Considerations

**Transactions:**
- Cost: 2x write capacity units (prepares + commits)
- Latency: Slightly higher than single operations (~10-20ms overhead)
- Limit: 100 operations per transaction, 4MB total size

**Atomic Counters:**
- Cost: 1 WCU per increment (standard write)
- Latency: Sub-10ms typical
- Throughput: 1000 increments/second per counter partition

**Hot Counter Mitigation:**
If a single counter exceeds 1000 writes/second:
```typescript
// Shard the counter across multiple partitions
const shard = hashCode(orgId + repoId) % 10  // 10 shards
const counterId = `COUNTER#${orgId}#${repoId}#${shard}`

// Query all shards and sum for total count
```

## Example: Complete Issue Creation Flow

```typescript
class IssueRepository {
  constructor(
    private table: Table,
    private issueRecord: IssueRecord,
    private counterRecord: CounterRecord,
    private repoRecord: RepoRecord
  ) {}

  async create(issue: IssueEntity): Promise<IssueEntity> {
    // Step 1: Get next issue number (atomic)
    const issueNumber = await this.incrementCounter(
      issue.owner,
      issue.repoName
    )

    // Step 2: Create issue with number
    const issueWithNumber = new IssueEntity({
      ...issue,
      issueNumber,
    })

    try {
      // Step 3: Transaction - create issue + verify repo exists
      const putIssue = this.issueRecord
        .build(PutTransaction)
        .item(issueWithNumber.toRecord())
        .options({ condition: { attr: "PK", exists: false } })

      const checkRepo = this.repoRecord
        .build(ConditionCheck)
        .key({ owner: issue.owner, repo_name: issue.repoName })
        .condition({ attr: "PK", exists: true })

      await execute(putIssue, checkRepo)

      // Step 4: Fetch created issue
      const created = await this.get(
        issue.owner,
        issue.repoName,
        issueNumber
      )

      if (!created) {
        throw new Error("Failed to retrieve created issue")
      }

      return created
    } catch (error: unknown) {
      handleTransactionError(error, {
        entityType: "IssueEntity",
        entityKey: issueWithNumber.getEntityKey(),
        parentEntityType: "RepositoryEntity",
        parentEntityKey: issue.getParentEntityKey(),
        operationName: "issue",
      })
    }
  }

  private async incrementCounter(
    owner: string,
    repoName: string
  ): Promise<number> {
    const result = await this.counterRecord
      .build(UpdateItemCommand)
      .item({
        org_id: owner,
        repo_id: repoName,
        current_value: $add(1),
      })
      .options({ returnValues: "ALL_NEW" })
      .send()

    return result.Attributes!.current_value
  }
}
```

This pattern ensures:
- ✓ Unique sequential issue numbers (atomic counter)
- ✓ No orphaned issues (repo existence check)
- ✓ No duplicate issues (PK exists check)
- ✓ Consistent state (transaction)
