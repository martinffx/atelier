# Error Response Patterns

Comprehensive error handling patterns using RFC 7807 Problem Details standard.

## Error Class Hierarchy

```typescript
type ErrorContext = {
  [key: string]: unknown
}

// Base error class
abstract class AppError extends Error {
  abstract readonly status: number
  abstract readonly type: string

  constructor(message: string, public readonly context?: ErrorContext) {
    super(message)
    this.name = this.constructor.name
  }

  toResponse(instance: string, traceId: string): ProblemDetail {
    return {
      type: this.type,
      status: this.status,
      title: this.name.replace(/Error$/, '').replace(/([A-Z])/g, ' $1').trim(),
      detail: this.message,
      instance,
      traceId,
      ...this.context,
    }
  }
}

// 4xx Client Errors
class BadRequestError extends AppError {
  readonly status = 400
  readonly type = 'BAD_REQUEST'
}

class UnauthorizedError extends AppError {
  readonly status = 401
  readonly type = 'UNAUTHORIZED'
}

class ForbiddenError extends AppError {
  readonly status = 403
  readonly type = 'FORBIDDEN'
}

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

class ValidationError extends AppError {
  readonly status = 422
  readonly type = 'VALIDATION_ERROR'

  constructor(
    message: string,
    public readonly errors: Array<{ field: string; message: string }>,
    context?: ErrorContext
  ) {
    super(message, { ...context, errors })
  }
}

class TooManyRequestsError extends AppError {
  readonly status = 429
  readonly type = 'TOO_MANY_REQUESTS'

  constructor(
    message: string,
    public readonly retryAfter: number,  // seconds
    context?: ErrorContext
  ) {
    super(message, { ...context, retryAfter })
  }
}

// 5xx Server Errors
class InternalServerError extends AppError {
  readonly status = 500
  readonly type = 'INTERNAL_SERVER_ERROR'
}

class ServiceUnavailableError extends AppError {
  readonly status = 503
  readonly type = 'SERVICE_UNAVAILABLE'

  constructor(
    message: string,
    public readonly retryable: boolean = true,
    context?: ErrorContext
  ) {
    super(message, { ...context, retryable })
  }
}
```

## TypeBox Schemas

Define error response schemas for OpenAPI:

```typescript
import { Type } from '@sinclair/typebox'

// Base ProblemDetail
const ProblemDetail = Type.Object({
  type: Type.String({ description: 'Error type identifier' }),
  status: Type.Number({ description: 'HTTP status code' }),
  title: Type.String({ description: 'Short, human-readable summary' }),
  detail: Type.String({ description: 'Specific explanation' }),
  instance: Type.String({ description: 'URI to this error occurrence' }),
  traceId: Type.String({ description: 'Request trace ID' }),
})

// Specific error responses
export const BadRequestErrorResponse = Type.Composite([
  ProblemDetail,
  Type.Object({
    type: Type.Literal('BAD_REQUEST'),
    status: Type.Literal(400),
  }),
], { $id: 'BadRequestErrorResponse' })

export const UnauthorizedErrorResponse = Type.Composite([
  ProblemDetail,
  Type.Object({
    type: Type.Literal('UNAUTHORIZED'),
    status: Type.Literal(401),
  }),
], { $id: 'UnauthorizedErrorResponse' })

export const ForbiddenErrorResponse = Type.Composite([
  ProblemDetail,
  Type.Object({
    type: Type.Literal('FORBIDDEN'),
    status: Type.Literal(403),
  }),
], { $id: 'ForbiddenErrorResponse' })

export const NotFoundErrorResponse = Type.Composite([
  ProblemDetail,
  Type.Object({
    type: Type.Literal('NOT_FOUND'),
    status: Type.Literal(404),
  }),
], { $id: 'NotFoundErrorResponse' })

export const ConflictErrorResponse = Type.Composite([
  ProblemDetail,
  Type.Object({
    type: Type.Literal('CONFLICT'),
    status: Type.Literal(409),
    retryable: Type.Optional(Type.Boolean()),
  }),
], { $id: 'ConflictErrorResponse' })

export const ValidationErrorResponse = Type.Composite([
  ProblemDetail,
  Type.Object({
    type: Type.Literal('VALIDATION_ERROR'),
    status: Type.Literal(422),
    errors: Type.Array(Type.Object({
      field: Type.String(),
      message: Type.String(),
    })),
  }),
], { $id: 'ValidationErrorResponse' })

export const TooManyRequestsErrorResponse = Type.Composite([
  ProblemDetail,
  Type.Object({
    type: Type.Literal('TOO_MANY_REQUESTS'),
    status: Type.Literal(429),
    retryAfter: Type.Number({ description: 'Seconds until retry allowed' }),
  }),
], { $id: 'TooManyRequestsErrorResponse' })

export const InternalServerErrorResponse = Type.Composite([
  ProblemDetail,
  Type.Object({
    type: Type.Literal('INTERNAL_SERVER_ERROR'),
    status: Type.Literal(500),
  }),
], { $id: 'InternalServerErrorResponse' })

export const ServiceUnavailableErrorResponse = Type.Composite([
  ProblemDetail,
  Type.Object({
    type: Type.Literal('SERVICE_UNAVAILABLE'),
    status: Type.Literal(503),
    retryable: Type.Optional(Type.Boolean()),
  }),
], { $id: 'ServiceUnavailableErrorResponse' })
```

## Global Error Handler (Fastify)

```typescript
import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify'

const globalErrorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  // Handle Fastify validation errors
  if (error.code === 'FST_ERR_VALIDATION') {
    return reply.status(400).send({
      type: 'BAD_REQUEST',
      status: 400,
      title: 'Bad Request',
      detail: error.message,
      instance: request.url,
      traceId: request.id,
    })
  }

  // Handle domain errors
  if (error instanceof AppError) {
    const response = error.toResponse(request.url, request.id)

    // Add Retry-After header for 429 and 503
    if (error instanceof TooManyRequestsError) {
      reply.header('Retry-After', error.retryAfter.toString())
    }
    if (error instanceof ServiceUnavailableError && error.retryable) {
      reply.header('Retry-After', '60')  // Default 60 seconds
    }

    return reply.status(error.status).send(response)
  }

  // Unknown error - log and return 500
  request.log.error({ err: error }, 'Unhandled error')
  return reply.status(500).send({
    type: 'INTERNAL_SERVER_ERROR',
    status: 500,
    title: 'Internal Server Error',
    detail: 'An unexpected error occurred',
    instance: request.url,
    traceId: request.id,
  })
}

app.setErrorHandler(globalErrorHandler)
```

## Usage Examples

### Not Found

```typescript
async function getUser(userId: string): Promise<UserEntity> {
  const record = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!record) {
    throw new NotFoundError(
      `User with ID ${userId} not found`,
      { userId }
    )
  }

  return UserEntity.fromRecord(record)
}

// Response
{
  "type": "NOT_FOUND",
  "status": 404,
  "title": "Not Found",
  "detail": "User with ID usr_abc123 not found",
  "instance": "/api/v1/users/usr_abc123",
  "traceId": "req_xyz789",
  "userId": "usr_abc123"
}
```

### Conflict with Retryable Flag

```typescript
async function updateAccount(entity: AccountEntity): Promise<AccountEntity> {
  const result = await db.update(accounts)
    .set(entity.toRecord())
    .where(and(
      eq(accounts.id, entity.id),
      eq(accounts.lockVersion, entity.lockVersion)
    ))
    .returning()

  if (result.length === 0) {
    throw new ConflictError(
      'Account was modified by another transaction',
      true,  // retryable
      { accountId: entity.id, lockVersion: entity.lockVersion }
    )
  }

  return AccountEntity.fromRecord(result[0])
}

// Response
{
  "type": "CONFLICT",
  "status": 409,
  "title": "Conflict",
  "detail": "Account was modified by another transaction",
  "instance": "/api/v1/accounts/acc_abc123",
  "traceId": "req_xyz789",
  "retryable": true,
  "accountId": "acc_abc123",
  "lockVersion": 5
}
```

### Validation Error

```typescript
async function createUser(rq: CreateUserRequest): Promise<UserEntity> {
  const errors: Array<{ field: string; message: string }> = []

  if (!rq.name || rq.name.length < 2) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters' })
  }

  if (!rq.email || !rq.email.includes('@')) {
    errors.push({ field: 'email', message: 'Invalid email format' })
  }

  if (errors.length > 0) {
    throw new ValidationError('Invalid user data', errors)
  }

  // Continue with creation...
}

// Response
{
  "type": "VALIDATION_ERROR",
  "status": 422,
  "title": "Validation Error",
  "detail": "Invalid user data",
  "instance": "/api/v1/users",
  "traceId": "req_xyz789",
  "errors": [
    { "field": "name", "message": "Name must be at least 2 characters" },
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

### Forbidden (Missing Permission)

```typescript
async function deleteUser(userId: string, token: Token): Promise<void> {
  if (!token.permissions.includes('user:delete')) {
    throw new ForbiddenError(
      'Missing permission: user:delete',
      { userId, requiredPermission: 'user:delete' }
    )
  }

  await userRepo.delete(userId)
}

// Response
{
  "type": "FORBIDDEN",
  "status": 403,
  "title": "Forbidden",
  "detail": "Missing permission: user:delete",
  "instance": "/api/v1/users/usr_abc123",
  "traceId": "req_xyz789",
  "userId": "usr_abc123",
  "requiredPermission": "user:delete"
}
```

### Rate Limit

```typescript
async function checkRateLimit(userId: string): Promise<void> {
  const limit = await rateLimiter.check(userId)

  if (limit.exceeded) {
    throw new TooManyRequestsError(
      'Rate limit exceeded',
      limit.resetIn,  // seconds
      { userId, limit: limit.max, window: '1 minute' }
    )
  }
}

// Response with Retry-After header
{
  "type": "TOO_MANY_REQUESTS",
  "status": 429,
  "title": "Too Many Requests",
  "detail": "Rate limit exceeded",
  "instance": "/api/v1/posts",
  "traceId": "req_xyz789",
  "retryAfter": 45,
  "userId": "usr_abc123",
  "limit": 100,
  "window": "1 minute"
}
```

### Service Unavailable (Database Error)

```typescript
function handleDBError(error: unknown, context: ErrorContext): never {
  const code = (error as { code?: string }).code

  switch (code) {
    case '40001':  // serialization_failure
    case 'OC000':  // occ_conflict (AWS DSQL)
      throw new ServiceUnavailableError(
        'Transaction conflict - please retry',
        true,  // retryable
        context
      )
    default:
      throw new InternalServerError('Database error', context)
  }
}

// Response with Retry-After header
{
  "type": "SERVICE_UNAVAILABLE",
  "status": 503,
  "title": "Service Unavailable",
  "detail": "Transaction conflict - please retry",
  "instance": "/api/v1/transactions",
  "traceId": "req_xyz789",
  "retryable": true
}
```

## Guidelines

1. **Use RFC 7807** - Standard ProblemDetail format for all errors
2. **Include context** - Add relevant IDs to error context for debugging
3. **Retryable flag** - Mark 409/503 errors as retryable when appropriate
4. **Validation arrays** - List all validation errors, not just the first one
5. **Retry-After header** - Include for 429 and 503 responses
6. **Log server errors** - Always log 500 errors with full stack trace
7. **Don't expose internals** - Keep error messages user-friendly, not technical
8. **Consistent types** - Use same error type strings across all services
9. **TraceId always** - Include request ID for correlating logs
10. **TypeBox schemas** - Define error response schemas for OpenAPI documentation
