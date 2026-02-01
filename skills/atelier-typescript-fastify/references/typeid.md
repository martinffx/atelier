# TypeID - Type-Safe Prefixed Identifiers

TypeID provides type-safe, globally unique identifiers with human-readable prefixes (e.g., `usr_01h455vb4pex5vsknk084sn02q`).

## Core Concept

TypeID combines:
- **K-sortable** - IDs sort chronologically (based on timestamp)
- **Type-safe** - TypeScript prevents mixing user IDs with post IDs
- **Human-readable** - Prefix indicates the entity type
- **Globally unique** - Based on UUIDv7 standard
- **URL-safe** - Uses base32 encoding (no special characters)

## Installation

```bash
npm i typeid-js
```

## Basic Usage

```typescript
import { TypeID } from 'typeid-js'

// Define typed ID types
type UserID = TypeID<'usr'>
type OrgID = TypeID<'org'>
type PostID = TypeID<'pst'>

// Create new IDs
const userId = new TypeID('usr')  // usr_01h455vb4pex5vsknk084sn02q
const orgId = new TypeID('org')   // org_01h455w3x8k5z9y7q1m0n2b3c4

// Parse from string
const parsed = TypeID.fromString<'usr'>('usr_01h455vb4pex5vsknk084sn02q')

// Convert to string
const idString = userId.toString()  // "usr_01h455vb4pex5vsknk084sn02q"

// Type safety prevents mixups
function getUser(id: UserID) { }
getUser(userId)  // ✅ OK
getUser(orgId)   // ❌ Type error - OrgID not assignable to UserID
```

## TypeBox Schema with TypeID

Validate TypeID format in API schemas:

```typescript
import { Type } from '@sinclair/typebox'
import { TypeID } from 'typeid-js'

// Schema with pattern validation
const UserIdParam = Type.Object({
  userId: Type.String({
    pattern: '^usr_[0-7][0-9a-hjkmnp-tv-z]{25}$',
    description: 'User ID',
  }),
})

// Route with TypeID parameter
app.get('/users/:userId', {
  schema: {
    operationId: 'getUser',
    tags: ['Users'],
    params: UserIdParam,
    response: {
      200: UserSchema,
      404: NotFoundErrorResponse,
    },
  },
}, async (request, reply) => {
  // Parse string to TypeID
  const userId = TypeID.fromString<'usr'>(request.params.userId)
  const user = await userService.getById(userId)
  return reply.send(user.toResponse())
})
```

## Entity Integration

Use TypeID in domain entities:

```typescript
import { TypeID } from 'typeid-js'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { users } from './schema'

type UserID = TypeID<'usr'>
type UserRecord = InferSelectModel<typeof users>
type UserInsert = InferInsertModel<typeof users>

export class UserEntity {
  public readonly id: UserID
  public readonly name: string
  public readonly email: string

  private constructor(data: {
    id: UserID
    name: string
    email: string
  }) {
    this.id = data.id
    this.name = data.name
    this.email = data.email
  }

  static fromRequest(rq: CreateUserRequest, id?: string): UserEntity {
    return new UserEntity({
      id: id ? TypeID.fromString<'usr'>(id) : new TypeID('usr'),
      name: rq.name,
      email: rq.email,
    })
  }

  static fromRecord(record: UserRecord): UserEntity {
    return new UserEntity({
      id: TypeID.fromString<'usr'>(record.id),
      name: record.name,
      email: record.email,
    })
  }

  toRecord(): UserInsert {
    return {
      id: this.id.toString(),  // TypeID → string for database
      name: this.name,
      email: this.email,
    }
  }

  toResponse(): UserResponse {
    return {
      id: this.id.toString(),  // TypeID → string for API
      name: this.name,
      email: this.email,
    }
  }
}
```

## Drizzle Schema with TypeID

Store TypeIDs as text with type annotations:

```typescript
import { pgTable, text, varchar, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  // Store as TEXT, but type as string for inference
  id: text('id').primaryKey().$type<string>(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Type inference works correctly
type UserRecord = InferSelectModel<typeof users>
// UserRecord.id is string, convert to TypeID in entity
```

## Multi-Tenancy with TypeID

Enforce organization-level isolation:

```typescript
import { TypeID } from 'typeid-js'

type OrgID = TypeID<'org'>
type LedgerID = TypeID<'lgr'>

export class LedgerRepo {
  constructor(private db: DrizzleDB) {}

  async getById(orgId: OrgID, ledgerId: LedgerID): Promise<LedgerEntity> {
    const record = await this.db.query.ledgers.findFirst({
      where: and(
        eq(ledgers.id, ledgerId.toString()),
        eq(ledgers.organizationId, orgId.toString())  // Multi-tenancy check
      ),
    })

    if (!record) {
      throw new NotFoundError('Ledger not found', {
        organizationId: orgId.toString(),
        ledgerId: ledgerId.toString(),
      })
    }

    return LedgerEntity.fromRecord(record)
  }
}
```

## Common Prefixes

Standardize prefixes across your application:

```typescript
// types/ids.ts
import type { TypeID } from 'typeid-js'

// User & Auth
export type UserID = TypeID<'usr'>
export type OrgID = TypeID<'org'>
export type TeamID = TypeID<'tem'>
export type ApiKeyID = TypeID<'key'>

// Content
export type PostID = TypeID<'pst'>
export type CommentID = TypeID<'cmt'>
export type TagID = TypeID<'tag'>

// Ledger (financial)
export type LedgerID = TypeID<'lgr'>
export type LedgerAccountID = TypeID<'lat'>
export type LedgerTransactionID = TypeID<'ltr'>
export type LedgerTransactionEntryID = TypeID<'lte'>

// Events
export type EventID = TypeID<'evt'>
export type JobID = TypeID<'job'>
```

## TypeBox Schema Generator

Reusable helper for TypeID schemas:

```typescript
import { Type, type TSchema } from '@sinclair/typebox'

// Generate TypeBox schema for any TypeID prefix
function TypeIDSchema<Prefix extends string>(prefix: Prefix) {
  return Type.String({
    pattern: `^${prefix}_[0-7][0-9a-hjkmnp-tv-z]{25}$`,
    description: `${prefix.toUpperCase()} ID`,
  })
}

// Usage
const UserIdSchema = TypeIDSchema('usr')
const OrgIdSchema = TypeIDSchema('org')
const PostIdSchema = TypeIDSchema('pst')

// In routes
const UserIdParam = Type.Object({
  userId: UserIdSchema,
})

const LedgerIdParam = Type.Object({
  orgId: OrgIdSchema,
  ledgerId: TypeIDSchema('lgr'),
})
```

## Error Context with TypeID

Include TypeIDs in error context for debugging:

```typescript
import { TypeID } from 'typeid-js'

type ErrorContext = {
  userId?: string
  organizationId?: string
  ledgerId?: string
  [key: string]: unknown
}

class NotFoundError extends Error {
  constructor(message: string, public readonly context?: ErrorContext) {
    super(message)
    this.name = 'NotFoundError'
  }

  toResponse() {
    return {
      type: 'NOT_FOUND',
      status: 404,
      title: 'Not Found',
      detail: this.message,
      ...this.context,  // Include IDs for debugging
    }
  }
}

// Usage
async getUser(userId: TypeID<'usr'>): Promise<UserEntity> {
  const record = await this.db.query.users.findFirst({
    where: eq(users.id, userId.toString()),
  })

  if (!record) {
    throw new NotFoundError('User not found', {
      userId: userId.toString(),  // Include in error context
    })
  }

  return UserEntity.fromRecord(record)
}
```

## Guidelines

1. **Use TypeID for all entity IDs** - Provides type safety and readability
2. **Define ID types** - Create typed aliases like `type UserID = TypeID<'usr'>`
3. **Store as text in DB** - Use `text('id').$type<string>()` in Drizzle schema
4. **Convert at boundaries** - Parse to TypeID in `fromRecord`, convert to string in `toRecord`
5. **Validate in schemas** - Use pattern matching to validate TypeID format in API
6. **Short prefixes** - Use 3-letter prefixes for readability (usr, org, pst)
7. **Consistent naming** - Standardize prefixes across your application
8. **Include in errors** - Add TypeIDs to error context for debugging
9. **Multi-tenancy** - Always include orgId in queries for tenant isolation
10. **Type safety** - Let TypeScript prevent ID mixups between different entity types
