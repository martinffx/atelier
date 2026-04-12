# Error Handling Patterns

Comprehensive error handling for DynamoDB operations with domain error mapping.

## DynamoDB Error Types

### ConditionalCheckFailedException

Thrown when a conditional expression evaluates to false.

**Common Causes:**
- Create operation: Item already exists (`exists: false` failed)
- Update operation: Item doesn't exist (`exists: true` failed)
- Custom conditions: Business rule validation failed

**From AWS SDK:**
```typescript
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'
```

### DynamoDBToolboxError

Thrown by dynamodb-toolbox for schema validation errors.

**Common Causes:**
- Required field missing
- Type mismatch (string vs number)
- Validation function returned false
- Invalid attribute name

**Properties:**
- `path`: Field path that failed validation
- `message`: Error description

### TransactionCanceledException

Thrown when a transaction fails.

**Key Property:**
- `CancellationReasons`: Array explaining why each operation failed

## Domain Error Classes

Define domain-specific errors that clients can handle meaningfully.

```typescript
// src/shared/errors.ts

export class DuplicateEntityError extends Error {
  public readonly entityType: string
  public readonly entityKey: string

  constructor(entityType: string, entityKey: string) {
    super(`${entityType} '${entityKey}' already exists`)
    this.name = "DuplicateEntityError"
    this.entityType = entityType
    this.entityKey = entityKey
  }
}

export class EntityNotFoundError extends Error {
  public readonly entityType: string
  public readonly entityKey: string

  constructor(entityType: string, entityKey: string) {
    super(`${entityType} '${entityKey}' not found`)
    this.name = "EntityNotFoundError"
    this.entityType = entityType
    this.entityKey = entityKey
  }
}

export class ValidationError extends Error {
  public readonly field: string

  constructor(field: string, message: string) {
    super(`Validation failed for '${field}': ${message}`)
    this.name = "ValidationError"
    this.field = field
  }
}
```

## Create Operation Error Handling

**Context:** Creating a new entity with duplicate prevention

```typescript
import { PutItemCommand } from 'dynamodb-toolbox'
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'
import { DynamoDBToolboxError } from 'dynamodb-toolbox'

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
    // Pattern: ConditionalCheckFailed → DuplicateEntityError
    if (error instanceof ConditionalCheckFailedException) {
      throw new DuplicateEntityError("UserEntity", user.username)
    }

    // Pattern: Schema validation → ValidationError
    if (error instanceof DynamoDBToolboxError) {
      throw new ValidationError(
        error.path ?? "entity",
        error.message
      )
    }

    // Unknown errors: re-throw
    throw error
  }
}
```

**Key Points:**
- `ConditionalCheckFailedException` → Item already exists
- Map to `DuplicateEntityError` with entity type and key
- Client can catch and show user-friendly message: "Username 'alice' already taken"

## Update Operation Error Handling

**Context:** Updating an existing entity with existence check

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
    // Pattern: ConditionalCheckFailed → EntityNotFoundError
    if (error instanceof ConditionalCheckFailedException) {
      throw new EntityNotFoundError("UserEntity", user.username)
    }

    if (error instanceof DynamoDBToolboxError) {
      throw new ValidationError(error.path ?? "entity", error.message)
    }

    throw error
  }
}
```

**Same Exception, Different Meaning:**
- Create: `ConditionalCheckFailed` → "already exists"
- Update: `ConditionalCheckFailed` → "not found"

Context determines the domain error mapping.

## Transaction Error Handling

**Context:** Multi-entity transaction (create issue, check repo exists)

```typescript
import { TransactionCanceledException } from '@aws-sdk/client-dynamodb'

async createIssue(issue: IssueEntity): Promise<IssueEntity> {
  try {
    // Transaction: PutTransaction + ConditionCheck
    await execute(putIssueTransaction, repoCheckTransaction)

    return await this.get(/* ... */)
  } catch (error: unknown) {
    handleTransactionError(error, {
      entityType: "IssueEntity",
      entityKey: issue.getEntityKey(),
      parentEntityType: "RepositoryEntity",
      parentEntityKey: issue.getParentEntityKey(),
      operationName: "issue",
    })
  }
}
```

### Transaction Error Handler

```typescript
function handleTransactionError(
  error: unknown,
  options: {
    entityType: string
    entityKey: string
    parentEntityType: string
    parentEntityKey: string
    operationName: string
  }
): never {
  if (error instanceof TransactionCanceledException) {
    const reasons = error.CancellationReasons || []

    // Validate we have expected number of cancellation reasons
    if (reasons.length < 2) {
      throw new ValidationError(
        "transaction",
        `Transaction failed with unexpected cancellation reason count: ${reasons.length}`
      )
    }

    // Index 0: The entity create/put operation
    if (reasons[0]?.Code === "ConditionalCheckFailed") {
      throw new DuplicateEntityError(options.entityType, options.entityKey)
    }

    // Index 1: The parent existence check
    if (reasons[1]?.Code === "ConditionalCheckFailed") {
      throw new EntityNotFoundError(
        options.parentEntityType,
        options.parentEntityKey
      )
    }

    // Unknown transaction failure
    throw new ValidationError(
      options.operationName,
      `Failed to create ${options.operationName} due to transaction conflict`
    )
  }

  if (error instanceof DynamoDBToolboxError) {
    throw new ValidationError(error.path ?? "entity", error.message)
  }

  throw error
}
```

**CancellationReasons Structure:**
```typescript
[
  { Code: "ConditionalCheckFailed" },  // Index 0: PutTransaction failed
  { Code: "ConditionalCheckFailed" },  // Index 1: ConditionCheck failed
]
```

**Mapping:**
- `reasons[0]` failed → Entity already exists (DuplicateEntityError)
- `reasons[1]` failed → Parent doesn't exist (EntityNotFoundError)

**Order Matters:** CancellationReasons array matches the order operations were passed to `execute()`.

## Three-Way Transaction Error Handling

**Context:** Create star with user + repo validation

```typescript
async createStar(star: StarEntity): Promise<StarEntity> {
  try {
    // Transaction: PutTransaction + UserCheck + RepoCheck
    await execute(putStarTransaction, userCheck, repoCheck)

    return await this.get(/* ... */)
  } catch (error: unknown) {
    handleThreeWayTransactionError(error, star)
  }
}

function handleThreeWayTransactionError(
  error: unknown,
  star: StarEntity
): never {
  if (error instanceof TransactionCanceledException) {
    const reasons = error.CancellationReasons || []

    if (reasons.length < 3) {
      throw new ValidationError(
        "transaction",
        `Expected 3 cancellation reasons, got ${reasons.length}`
      )
    }

    // Index 0: Star creation
    if (reasons[0]?.Code === "ConditionalCheckFailed") {
      throw new DuplicateEntityError(
        "StarEntity",
        star.getEntityKey()
      )
    }

    // Index 1: User existence check
    if (reasons[1]?.Code === "ConditionalCheckFailed") {
      throw new EntityNotFoundError("UserEntity", star.username)
    }

    // Index 2: Repo existence check
    if (reasons[2]?.Code === "ConditionalCheckFailed") {
      throw new EntityNotFoundError(
        "RepositoryEntity",
        `${star.repoOwner}/${star.repoName}`
      )
    }

    throw new ValidationError(
      "star",
      "Failed to create star due to transaction conflict"
    )
  }

  throw error
}
```

## Reusable Error Handlers

Create utility functions for common patterns:

```typescript
// src/repos/utils.ts

export function handleCreateError(
  error: unknown,
  entityType: string,
  entityKey: string
): never {
  if (error instanceof ConditionalCheckFailedException) {
    throw new DuplicateEntityError(entityType, entityKey)
  }
  if (error instanceof DynamoDBToolboxError) {
    throw new ValidationError(error.path ?? "entity", error.message)
  }
  throw error
}

export function handleUpdateError(
  error: unknown,
  entityType: string,
  entityKey: string
): never {
  if (error instanceof ConditionalCheckFailedException) {
    throw new EntityNotFoundError(entityType, entityKey)
  }
  if (error instanceof DynamoDBToolboxError) {
    throw new ValidationError(error.path ?? "entity", error.message)
  }
  throw error
}
```

**Usage:**

```typescript
async create(user: UserEntity): Promise<UserEntity> {
  try {
    const result = await this.entity
      .build(PutItemCommand)
      .item(user.toRecord())
      .options({ condition: { attr: "PK", exists: false } })
      .send()

    return UserEntity.fromRecord(result.ToolboxItem)
  } catch (error: unknown) {
    handleCreateError(error, "UserEntity", user.username)
  }
}
```

## Testing Error Handling

### Test Duplicate Creation

```typescript
it("should throw DuplicateEntityError for duplicate username", async () => {
  const user1 = createUserEntity({ username: "alice" })
  const user2 = createUserEntity({ username: "alice" })

  await userRepo.create(user1)

  await expect(userRepo.create(user2)).rejects.toThrow(DuplicateEntityError)
  await expect(userRepo.create(user2)).rejects.toThrow("already exists")
})
```

### Test Update Non-Existent

```typescript
it("should throw EntityNotFoundError when updating non-existent user", async () => {
  const user = createUserEntity({ username: "nonexistent" })

  await expect(userRepo.update(user)).rejects.toThrow(EntityNotFoundError)
  await expect(userRepo.update(user)).rejects.toThrow("not found")
})
```

### Test Transaction Validation

```typescript
it("should throw EntityNotFoundError when creating issue for non-existent repo", async () => {
  const issue = IssueEntity.fromRequest({
    owner: "alice",
    repo_name: "nonexistent",
    title: "Test Issue",
    author: "bob",
  })

  await expect(issueRepo.create(issue)).rejects.toThrow(EntityNotFoundError)
  await expect(issueRepo.create(issue)).rejects.toThrow("RepositoryEntity")
})
```

## Error Response Formatting (API Layer)

Convert domain errors to HTTP responses:

```typescript
// src/routes/users.ts (Fastify example)

app.post("/users", async (request, reply) => {
  try {
    const user = UserEntity.fromRequest(request.body)
    const created = await userService.create(user)
    return reply.status(201).send(created.toResponse())
  } catch (error) {
    if (error instanceof DuplicateEntityError) {
      return reply.status(409).send({
        error: "Conflict",
        message: error.message,
        entityType: error.entityType,
        entityKey: error.entityKey,
      })
    }

    if (error instanceof ValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        message: error.message,
        field: error.field,
      })
    }

    if (error instanceof EntityNotFoundError) {
      return reply.status(404).send({
        error: "Not Found",
        message: error.message,
      })
    }

    // Unknown errors: 500
    console.error("Unexpected error:", error)
    return reply.status(500).send({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    })
  }
})
```

**HTTP Status Code Mapping:**
- `DuplicateEntityError` → 409 Conflict
- `EntityNotFoundError` → 404 Not Found
- `ValidationError` → 400 Bad Request
- Unknown → 500 Internal Server Error

## Best Practices

### ✓ Do

- Always catch `ConditionalCheckFailedException` and map to domain errors
- Include entity type and key in error messages
- Inspect `CancellationReasons` array order for transactions
- Log unexpected errors before re-throwing
- Test error handling paths explicitly

### ✗ Don't

- Don't expose DynamoDB error details to clients
- Don't assume transaction error order - always check CancellationReasons
- Don't ignore `DynamoDBToolboxError` - it indicates schema issues
- Don't retry blindly on transaction errors (may have partial state)

## Error Handling Checklist

For each repository operation:

- [ ] **Create operations** - Catch `ConditionalCheckFailed` → `DuplicateEntityError`
- [ ] **Update operations** - Catch `ConditionalCheckFailed` → `EntityNotFoundError`
- [ ] **Transactions** - Parse `CancellationReasons` by index
- [ ] **Schema validation** - Catch `DynamoDBToolboxError` → `ValidationError`
- [ ] **Unknown errors** - Re-throw with logging
- [ ] **API layer** - Map domain errors to HTTP status codes
- [ ] **Tests** - Verify error handling for each failure scenario
