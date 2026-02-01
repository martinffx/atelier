---
name: api-design
description: REST API design patterns. Use when designing endpoints, error responses, pagination, versioning, or API structure. Framework-agnostic principles for building consistent, maintainable APIs.
user-invocable: false
---

# API Design Patterns

Best practices for designing REST APIs with consistent structure, error handling, and resource patterns.

## Additional References

- [references/error-responses.md](./references/error-responses.md) - Detailed error handling examples

## Resource Naming

Use consistent, predictable URL patterns:

```
# Collection resources (plural nouns)
GET    /api/v1/users              # List users
POST   /api/v1/users              # Create user
GET    /api/v1/users/:id          # Get user
PUT    /api/v1/users/:id          # Update user (full)
PATCH  /api/v1/users/:id          # Update user (partial)
DELETE /api/v1/users/:id          # Delete user

# Nested resources
GET    /api/v1/users/:userId/posts          # List user's posts
POST   /api/v1/users/:userId/posts          # Create post for user
GET    /api/v1/users/:userId/posts/:postId  # Get specific post

# Actions (use verbs sparingly)
POST   /api/v1/users/:id/activate          # Activate user
POST   /api/v1/posts/:id/publish           # Publish post
POST   /api/v1/invoices/:id/send           # Send invoice
```

### Guidelines

- Use plural nouns for collections (`/users`, not `/user`)
- Use lowercase with hyphens for multi-word resources (`/ledger-accounts`)
- Avoid deep nesting (max 2 levels: `/users/:id/posts/:id`)
- Use query parameters for filtering, sorting, pagination
- Use verbs only for actions that don't fit CRUD (activate, publish, send)

## API Versioning

Version APIs in the URL path:

```
/api/v1/users
/api/v2/users

# Not in headers (harder to test/debug)
# Not in query params (breaks caching)
```

### Version Strategy

```typescript
// v1/routes.ts
export async function v1Routes(app: FastifyInstance) {
  app.get('/users', getUsersV1)
  app.post('/users', createUserV1)
}

// v2/routes.ts
export async function v2Routes(app: FastifyInstance) {
  app.get('/users', getUsersV2)  // Breaking change in response structure
  app.post('/users', createUserV2)
}

// server.ts
app.register(v1Routes, { prefix: '/api/v1' })
app.register(v2Routes, { prefix: '/api/v2' })
```

## RFC 7807 Problem Details

Standardized error response format:

```typescript
interface ProblemDetail {
  type: string          // Error type identifier
  status: number        // HTTP status code
  title: string         // Short, human-readable summary
  detail: string        // Specific explanation for this occurrence
  instance: string      // URI reference to specific occurrence
  traceId: string       // Request trace ID for debugging
}

// Example error response
{
  "type": "NOT_FOUND",
  "status": 404,
  "title": "Not Found",
  "detail": "User with ID usr_01h455vb4pex5vsknk084sn02q not found",
  "instance": "/api/v1/users/usr_01h455vb4pex5vsknk084sn02q",
  "traceId": "req_abc123xyz"
}
```

### Error Types

```typescript
// Domain error base class
abstract class AppError extends Error {
  abstract readonly status: number
  abstract readonly type: string

  constructor(message: string, public readonly context?: ErrorContext) {
    super(message)
  }

  toResponse(instance: string, traceId: string): ProblemDetail {
    return {
      type: this.type,
      status: this.status,
      title: this.name,
      detail: this.message,
      instance,
      traceId,
      ...this.context,
    }
  }
}

// Specific error types
class NotFoundError extends AppError {
  readonly status = 404
  readonly type = 'NOT_FOUND'
}

class ConflictError extends AppError {
  readonly status = 409
  readonly type = 'CONFLICT'

  constructor(
    message: string,
    public readonly retryable: boolean = false,
    context?: ErrorContext
  ) {
    super(message, context)
  }
}

class ServiceUnavailableError extends AppError {
  readonly status = 503
  readonly type = 'SERVICE_UNAVAILABLE'

  constructor(
    message: string,
    public readonly retryable: boolean = true,
    context?: ErrorContext
  ) {
    super(message, context)
  }
}
```

See [references/error-responses.md](./references/error-responses.md) for complete examples.

## Pagination (Cursor-Based)

Use cursor-based pagination for large datasets:

```typescript
// Request
GET /api/v1/posts?limit=20&cursor=pst_01h455vb4pex5vsknk084sn02q

// Response
{
  "items": [
    { "id": "pst_01h455w3x8k5z9y7q1m0n2b3c4", ... },
    { "id": "pst_01h455x2y9l6a0z8r2n1o3c5d6", ... }
  ],
  "nextCursor": "pst_01h455z1a0m7b8y9s3o2p4d6e7",
  "hasMore": true
}
```

### Implementation

```typescript
interface PaginatedRequest {
  limit?: number   // Max items to return (default 20, max 100)
  cursor?: string  // Cursor for next page (opaque to client)
}

interface PaginatedResponse<T> {
  items: T[]
  nextCursor?: string
  hasMore: boolean
}

async function listPosts(req: PaginatedRequest): Promise<PaginatedResponse<Post>> {
  const limit = Math.min(req.limit ?? 20, 100)
  const queryLimit = limit + 1  // Fetch one extra to check hasMore

  const posts = await db.query.posts.findMany({
    where: req.cursor ? gt(posts.id, req.cursor) : undefined,
    orderBy: desc(posts.createdAt),
    limit: queryLimit,
  })

  const hasMore = posts.length > limit
  const items = posts.slice(0, limit)
  const nextCursor = hasMore ? items[items.length - 1].id : undefined

  return { items, nextCursor, hasMore }
}
```

### Why Cursor Over Offset

```
❌ Offset-based (/posts?offset=40&limit=20)
  - Unstable: Items can shift if new records inserted
  - Performance: DB must scan all previous rows
  - Inaccurate: Can miss or duplicate items

✅ Cursor-based (/posts?cursor=pst_xyz&limit=20)
  - Stable: Cursor points to specific item
  - Performant: DB uses index seek
  - Accurate: No gaps or duplicates
```

## Filtering & Sorting

Use query parameters for filtering and sorting:

```
# Filtering
GET /api/v1/users?status=active&role=admin
GET /api/v1/posts?author=usr_abc&published=true

# Sorting
GET /api/v1/posts?sort=-createdAt      # Descending (- prefix)
GET /api/v1/users?sort=name             # Ascending

# Combined
GET /api/v1/posts?author=usr_abc&status=published&sort=-createdAt&limit=20
```

### Implementation

```typescript
interface ListPostsQuery {
  author?: string
  status?: 'draft' | 'published'
  sort?: 'createdAt' | '-createdAt' | 'title' | '-title'
  limit?: number
  cursor?: string
}

async function listPosts(query: ListPostsQuery): Promise<PaginatedResponse<Post>> {
  const conditions = []

  if (query.author) {
    conditions.push(eq(posts.authorId, query.author))
  }
  if (query.status) {
    conditions.push(eq(posts.status, query.status))
  }

  const orderByColumn = query.sort?.startsWith('-')
    ? query.sort.slice(1)
    : query.sort ?? 'createdAt'
  const orderByDirection = query.sort?.startsWith('-') ? desc : asc

  return await db.query.posts.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: orderByDirection(posts[orderByColumn]),
    limit: query.limit ?? 20,
  })
}
```

## HTTP Status Codes

Use status codes consistently:

```
# Success
200 OK               # Successful GET, PUT, PATCH
201 Created          # Successful POST (include Location header)
204 No Content       # Successful DELETE, PUT with no response body

# Client Errors
400 Bad Request      # Invalid request body/parameters
401 Unauthorized     # Missing or invalid authentication
403 Forbidden        # Valid auth, but lacks permission
404 Not Found        # Resource doesn't exist
409 Conflict         # Resource already exists, optimistic lock failure
422 Unprocessable    # Validation error (semantic)
429 Too Many Requests # Rate limit exceeded

# Server Errors
500 Internal Server Error  # Unexpected error
503 Service Unavailable    # Temporary unavailability, retry later
```

## Response Envelope (When to Use)

**Don't use envelopes for simple CRUD:**

```typescript
// ❌ Unnecessary wrapping
GET /api/v1/users/123
{
  "success": true,
  "data": { "id": "123", "name": "Alice" }
}

// ✅ Return resource directly
GET /api/v1/users/123
{
  "id": "123",
  "name": "Alice"
}
```

**Use envelopes for pagination:**

```typescript
// ✅ Envelope needed for metadata
GET /api/v1/users?limit=20
{
  "items": [...],
  "nextCursor": "usr_xyz",
  "hasMore": true
}
```

## Timestamps

Use ISO 8601 format for all timestamps:

```typescript
{
  "createdAt": "2024-01-15T14:30:00.000Z",  // ISO 8601 UTC
  "updatedAt": "2024-01-16T09:15:30.123Z"
}

// In entities
toResponse(): UserResponse {
  return {
    ...
    createdAt: this.createdAt.toISOString(),  // Date → ISO string
    updatedAt: this.updatedAt.toISOString(),
  }
}
```

## Idempotency

Use idempotency keys for safe retries:

```typescript
// Request
POST /api/v1/transactions
Headers:
  Idempotency-Key: txn_abc123xyz
Body:
  { "amount": 100, "from": "usr_123", "to": "usr_456" }

// Implementation
async function createTransaction(rq: CreateTransactionRequest, idempotencyKey: string) {
  // Check if transaction with this key already exists
  const existing = await db.query.transactions.findFirst({
    where: eq(transactions.idempotencyKey, idempotencyKey),
  })

  if (existing) {
    return TransactionEntity.fromRecord(existing)  // Return existing
  }

  // Create new transaction
  const transaction = TransactionEntity.fromRequest(rq, idempotencyKey)
  return await transactionRepo.create(transaction)
}
```

## Guidelines

1. **Plural nouns** - Collections use plural resource names
2. **Lowercase with hyphens** - Multi-word resources like `ledger-accounts`
3. **Version in URL** - `/api/v1/`, `/api/v2/` for breaking changes
4. **RFC 7807 errors** - Standardized error response format
5. **Cursor pagination** - For large datasets (more stable than offset)
6. **Query params** - For filtering, sorting, pagination (not in path)
7. **HTTP status codes** - Use correct codes (200, 201, 204, 400, 404, 409, 500, 503)
8. **ISO 8601 timestamps** - Always use `.toISOString()` for dates
9. **Idempotency keys** - For non-idempotent operations (POST, PATCH)
10. **No unnecessary envelopes** - Return resources directly unless pagination needed
