# Entity Layer Transformation Patterns

Domain entities manage all data transformations between layers, ensuring clean separation of concerns.

## The Four Transformation Methods

Every domain entity implements four methods for layer boundary crossing:

```typescript
class EntityName {
  // 1. API Request → Domain Entity
  static fromRequest(request: EntityCreateRequest): EntityName

  // 2. DynamoDB Record → Domain Entity
  static fromRecord(record: EntityFormatted): EntityName

  // 3. Domain Entity → DynamoDB Record
  toRecord(): EntityInput

  // 4. Domain Entity → API Response
  toResponse(): EntityResponse
}
```

## Data Flow Through Layers

### Create/Update Flow

```
HTTP Request
    ↓ fromRequest()
Domain Entity
    ↓ toRecord()
DynamoDB Record
    ↓ DynamoDB save
DynamoDB Record (with timestamps)
    ↓ fromRecord()
Domain Entity
    ↓ toResponse()
HTTP Response
```

### Read Flow

```
HTTP Request
    ↓ repository.get(id)
DynamoDB Record
    ↓ fromRecord()
Domain Entity
    ↓ toResponse()
HTTP Response
```

## Complete Entity Example

```typescript
import { type InputItem, type FormattedItem } from 'dynamodb-toolbox/entity'
import { DateTime } from 'luxon'

// Type exports from schema
type IssueRecord = typeof IssueRecord
type IssueInput = InputItem<typeof IssueRecord>
type IssueFormatted = FormattedItem<typeof IssueRecord>

// API types
interface IssueCreateRequest {
  owner: string
  repo_name: string
  title: string
  body?: string
  author: string
  assignees?: string[]
  labels?: string[]
}

interface IssueResponse {
  owner: string
  repo_name: string
  issue_number: number
  title: string
  body?: string
  status: "open" | "closed"
  author: string
  assignees: string[]
  labels: string[]
  created_at: string
  updated_at: string
}

// Domain entity
class IssueEntity {
  // Immutable properties
  public readonly owner: string
  public readonly repoName: string
  public readonly issueNumber: number
  public readonly title: string
  public readonly body?: string
  public readonly status: "open" | "closed"
  public readonly author: string
  public readonly assignees: string[]
  public readonly labels: string[]
  public readonly created: DateTime
  public readonly modified: DateTime

  constructor(props: IssueEntityOpts) {
    this.owner = props.owner
    this.repoName = props.repoName
    this.issueNumber = props.issueNumber
    this.title = props.title
    this.body = props.body
    this.status = props.status || "open"
    this.author = props.author
    this.assignees = props.assignees || []
    this.labels = props.labels || []
    this.created = props.created || DateTime.utc()
    this.modified = props.modified || DateTime.utc()
  }

  // 1. API Request → Entity
  static fromRequest(data: IssueCreateRequest): IssueEntity {
    // Validation
    IssueEntity.validate(data)

    return new IssueEntity({
      owner: data.owner,
      repoName: data.repo_name,
      issueNumber: 0, // Set by repository after getting from counter
      title: data.title,
      body: data.body,
      status: "open",
      author: data.author,
      assignees: data.assignees || [],
      labels: data.labels || [],
    })
  }

  // 2. DynamoDB Record → Entity
  static fromRecord(record: IssueFormatted): IssueEntity {
    return new IssueEntity({
      owner: record.owner,
      repoName: record.repo_name,
      issueNumber: record.issue_number,
      title: record.title,
      body: record.body,
      status: record.status,
      author: record.author,
      // DynamoDB Sets → Arrays
      assignees: record.assignees ? Array.from(record.assignees) : [],
      labels: record.labels ? Array.from(record.labels) : [],
      // ISO strings → DateTime
      created: DateTime.fromISO(record.created),
      modified: DateTime.fromISO(record.modified),
    })
  }

  // 3. Entity → DynamoDB Record
  toRecord(): IssueInput {
    return {
      owner: this.owner,
      repo_name: this.repoName,
      issue_number: this.issueNumber,
      title: this.title,
      body: this.body,
      status: this.status,
      author: this.author,
      // Arrays → Sets (DynamoDB doesn't allow empty sets)
      assignees: this.assignees.length > 0
        ? new Set(this.assignees)
        : undefined,
      labels: this.labels.length > 0
        ? new Set(this.labels)
        : undefined,
      // DateTime → ISO strings handled by DynamoDB Toolbox
    }
  }

  // 4. Entity → API Response
  toResponse(): IssueResponse {
    return {
      owner: this.owner,
      repo_name: this.repoName,
      issue_number: this.issueNumber,
      title: this.title,
      body: this.body,
      status: this.status,
      author: this.author,
      assignees: this.assignees,
      labels: this.labels,
      created_at: this.created.toISO() ?? "",
      updated_at: this.modified.toISO() ?? "",
    }
  }

  // Validation (called by fromRequest)
  private static validate(data: IssueCreateRequest): void {
    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationError("title", "Title is required")
    }
    if (data.title.length > 256) {
      throw new ValidationError("title", "Title must be 256 characters or less")
    }
  }

  // Immutable update (returns new instance)
  updateIssue(opts: UpdateIssueEntityOpts): IssueEntity {
    return new IssueEntity({
      // Preserve immutable fields
      owner: this.owner,
      repoName: this.repoName,
      issueNumber: this.issueNumber,
      author: this.author,
      created: this.created,
      // Apply updates
      title: opts.title ?? this.title,
      body: opts.body ?? this.body,
      status: opts.status ?? this.status,
      assignees: opts.assignees ?? this.assignees,
      labels: opts.labels ?? this.labels,
      // Update timestamp
      modified: DateTime.utc(),
    })
  }

  // Helper: Entity key for error messages
  getEntityKey(): string {
    return `ISSUE#${this.owner}#${this.repoName}#${this.issueNumber}`
  }

  // Helper: Parent entity key for transactions
  getParentEntityKey(): string {
    return `REPO#${this.owner}#${this.repoName}`
  }
}
```

## Field Naming Conventions

### Entity Layer (TypeScript/camelCase)

```typescript
class RepositoryEntity {
  public readonly repoName: string
  public readonly isPrivate: boolean
  public readonly paymentPlanId?: string
}
```

### Database Layer (DynamoDB/snake_case)

```typescript
schema: item({
  repo_name: string().required(),
  is_private: boolean().default(false),
  payment_plan_id: string().optional(),
})
```

### Mapping in Transformations

```typescript
// fromRecord: snake_case → camelCase
static fromRecord(record: RepoFormatted): RepositoryEntity {
  return new RepositoryEntity({
    repoName: record.repo_name,
    isPrivate: record.is_private,
    paymentPlanId: record.payment_plan_id,
  })
}

// toRecord: camelCase → snake_case
toRecord(): RepoInput {
  return {
    repo_name: this.repoName,
    is_private: this.isPrivate,
    payment_plan_id: this.paymentPlanId,
  }
}

// toResponse: camelCase → snake_case (API convention)
toResponse(): RepoResponse {
  return {
    repo_name: this.repoName,
    is_private: this.isPrivate,
    payment_plan_id: this.paymentPlanId,
  }
}
```

**Why snake_case for API responses?**
Matches common REST API conventions and DynamoDB attribute names.

## DynamoDB Set Conversion

DynamoDB doesn't support empty Sets - convert to/from Arrays.

### Reading: Set → Array

```typescript
static fromRecord(record: IssueFormatted): IssueEntity {
  return new IssueEntity({
    // DynamoDB Set (or undefined) → Array
    assignees: record.assignees ? Array.from(record.assignees) : [],
    labels: record.labels ? Array.from(record.labels) : [],
  })
}
```

### Writing: Array → Set (or undefined)

```typescript
toRecord(): IssueInput {
  return {
    // Array → Set (only if non-empty)
    assignees: this.assignees.length > 0
      ? new Set(this.assignees)
      : undefined,
    labels: this.labels.length > 0
      ? new Set(this.labels)
      : undefined,
  }
}
```

**Critical:** DynamoDB rejects empty Sets. Always check length before creating Set.

## Timestamp Handling

DynamoDB Toolbox auto-manages `created` and `modified` timestamps.

### Schema Configuration

```typescript
// Timestamps are added automatically as _ct and _md
// When querying through Entity, they're formatted as 'created' and 'modified'
const entity = new Entity({
  name: "USER",
  table: AppTable,
  schema: item({
    username: string().required().key(),
    // created/modified added automatically
  }),
})
```

### Reading Timestamps

```typescript
static fromRecord(record: UserFormatted): UserEntity {
  return new UserEntity({
    username: record.username,
    // DynamoDB Toolbox returns ISO strings
    created: DateTime.fromISO(record.created),
    modified: DateTime.fromISO(record.modified),
  })
}
```

### Writing Timestamps

```typescript
// Don't include created/modified in toRecord()
// DynamoDB Toolbox handles them automatically
toRecord(): UserInput {
  return {
    username: this.username,
    email: this.email,
    // created/modified omitted - auto-managed
  }
}
```

## Immutable Update Pattern

Never mutate entity properties. Return new instance with updated values.

```typescript
class UserEntity {
  public readonly username: string  // Never changes
  public readonly email: string
  public readonly bio?: string
  public readonly created: DateTime  // Never changes
  public readonly modified: DateTime

  // Immutable update
  updateUser(opts: UpdateUserEntityOpts): UserEntity {
    return new UserEntity({
      // Preserve identity
      username: this.username,
      created: this.created,
      // Apply updates
      email: opts.email ?? this.email,
      bio: opts.bio ?? this.bio,
      // Update timestamp
      modified: DateTime.utc(),
    })
  }
}
```

**Usage:**

```typescript
// Repository layer
async update(user: UserEntity): Promise<UserEntity> {
  // Create updated entity with new timestamp
  const updated = user.updateUser({
    email: "newemail@example.com",
  })

  // Save to DynamoDB
  const result = await this.entity
    .build(PutItemCommand)
    .item(updated.toRecord())
    .send()

  return UserEntity.fromRecord(result.ToolboxItem)
}
```

**Why immutable?**
- Predictable: No hidden state changes
- Testable: Pure functions
- Thread-safe: No race conditions
- Traceable: Clear audit trail

## Validation in fromRequest

Validate business rules when converting API request to entity.

```typescript
static fromRequest(data: RepositoryCreateRequest): RepositoryEntity {
  // Validate required fields
  if (!data.owner || data.owner.trim().length === 0) {
    throw new ValidationError("owner", "Owner is required")
  }

  // Validate format
  if (!/^[a-zA-Z0-9_-]+$/.test(data.owner)) {
    throw new ValidationError(
      "owner",
      "Owner must contain only alphanumeric characters, hyphens, and underscores"
    )
  }

  // Validate length
  if (data.repo_name.length > 100) {
    throw new ValidationError(
      "repo_name",
      "Repository name must be 100 characters or less"
    )
  }

  return new RepositoryEntity({
    owner: data.owner,
    repoName: data.repo_name,
    description: data.description,
    isPrivate: data.is_private ?? false,
  })
}
```

**Validation Layers:**
1. **Schema validation** (DynamoDB Toolbox) - Type and required fields
2. **Business validation** (Entity `fromRequest`) - Format, length, rules
3. **Existence validation** (Repository transactions) - Foreign key checks

## Helper Methods

### getEntityKey()

Returns entity identifier for error messages.

```typescript
getEntityKey(): string {
  return `ISSUE#${this.owner}#${this.repoName}#${this.issueNumber}`
}

// Usage in error handling
throw new EntityNotFoundError("IssueEntity", issue.getEntityKey())
// → "IssueEntity 'ISSUE#alice#my-repo#00000001' not found"
```

### getParentEntityKey()

Returns parent entity identifier for transaction error handling.

```typescript
getParentEntityKey(): string {
  return `REPO#${this.owner}#${this.repoName}`
}

// Usage in transaction error handling
handleTransactionError(error, {
  entityType: "IssueEntity",
  entityKey: issue.getEntityKey(),
  parentEntityType: "RepositoryEntity",
  parentEntityKey: issue.getParentEntityKey(),
})
```

## Testing Entity Transformations

Entity transformations are tested implicitly through repository tests, not in isolation.

**Don't:**
```typescript
// ❌ Don't test transformations in isolation
describe("IssueEntity", () => {
  it("should convert to record", () => {
    const issue = new IssueEntity(/* ... */)
    const record = issue.toRecord()
    expect(record.owner).toBe(issue.owner)
  })
})
```

**Do:**
```typescript
// ✓ Test through repository layer
describe("IssueRepository", () => {
  it("should create issue and retrieve with correct data", async () => {
    const issue = IssueEntity.fromRequest({
      owner: "alice",
      repo_name: "my-repo",
      title: "Test Issue",
      author: "bob",
    })

    const created = await issueRepo.create(issue)

    // Transformations tested implicitly
    expect(created.owner).toBe("alice")
    expect(created.repoName).toBe("my-repo")
    expect(created.title).toBe("Test Issue")
  })
})
```

**Why?** Entity transformations are an implementation detail. Test the full flow (API → DynamoDB → API) through repository tests.

## Best Practices

### ✓ Do

- Implement all four transformation methods
- Use immutable entity properties
- Return new instances from update methods
- Convert Sets ↔ Arrays (handle empty sets)
- Parse timestamps to DateTime objects
- Validate in `fromRequest()`
- Use helper methods for entity keys

### ✗ Don't

- Don't mutate entity properties
- Don't include timestamps in `toRecord()` (auto-managed)
- Don't create empty Sets (DynamoDB rejects them)
- Don't test entity transformations in isolation
- Don't include PK/SK in entity (computed by schema)

## Entity Transformation Checklist

For each domain entity:

- [ ] **Four methods implemented** - fromRequest, fromRecord, toRecord, toResponse
- [ ] **Immutable properties** - All fields marked `readonly`
- [ ] **Immutable updates** - `updateEntity()` returns new instance
- [ ] **Field naming** - camelCase in entity, snake_case in DB
- [ ] **Set conversion** - Arrays ↔ Sets with empty check
- [ ] **Timestamp handling** - DateTime objects, not included in toRecord
- [ ] **Validation** - Business rules in fromRequest
- [ ] **Helper methods** - getEntityKey() and getParentEntityKey()
- [ ] **Type exports** - EntityInput and EntityFormatted from schema
