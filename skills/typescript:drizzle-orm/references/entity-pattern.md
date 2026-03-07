# Entity Pattern

Domain entities encapsulate business logic and data transformations between API, domain, and database layers.

## Core Concept

Entities have **four transformation methods**:

1. `fromRequest(rq)` - API request → Entity
2. `fromRecord(record)` - Database record → Entity
3. `toRecord()` - Entity → Database insert/update
4. `toResponse()` - Entity → API response

This creates clear boundaries between layers and centralizes data transformation logic.

## Basic Entity

```typescript
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { users } from '../schema'

// Infer types from schema
type UserRecord = InferSelectModel<typeof users>
type UserInsert = InferInsertModel<typeof users>

interface UserEntityData {
  id: string
  name: string
  email: string
  createdAt: Date
  updatedAt: Date
}

export class UserEntity {
  public readonly id: string
  public readonly name: string
  public readonly email: string
  public readonly createdAt: Date
  public readonly updatedAt: Date

  // Private constructor enforces factory methods
  private constructor(data: UserEntityData) {
    this.id = data.id
    this.name = data.name
    this.email = data.email
    this.createdAt = data.createdAt
    this.updatedAt = data.updatedAt
  }

  // 1. API request → Entity
  static fromRequest(rq: CreateUserRequest, id?: string): UserEntity {
    const now = new Date()
    return new UserEntity({
      id: id ?? crypto.randomUUID(),
      name: rq.name,
      email: rq.email,
      createdAt: now,
      updatedAt: now,
    })
  }

  // 2. DB record → Entity
  static fromRecord(record: UserRecord): UserEntity {
    return new UserEntity({
      id: record.id,
      name: record.name,
      email: record.email,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    })
  }

  // 3. Entity → DB record
  toRecord(): UserInsert {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }

  // 4. Entity → API response
  toResponse(): UserResponse {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    }
  }
}
```

## Entity with TypeID

Using TypeID for type-safe prefixed identifiers:

```typescript
import { TypeID } from 'typeid-js'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { users } from '../schema'

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
      id: this.id.toString(),  // TypeID → string for DB
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

## Entity with JSON Fields

Handle JSON serialization/deserialization:

```typescript
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { users } from '../schema'

type UserMetadata = {
  theme: 'light' | 'dark'
  notifications: boolean
}

type UserRecord = InferSelectModel<typeof users>
type UserInsert = InferInsertModel<typeof users>

export class UserEntity {
  public readonly id: string
  public readonly name: string
  public readonly metadata?: UserMetadata

  private constructor(data: {
    id: string
    name: string
    metadata?: UserMetadata
  }) {
    this.id = data.id
    this.name = data.name
    this.metadata = data.metadata
  }

  static fromRequest(rq: CreateUserRequest, id?: string): UserEntity {
    return new UserEntity({
      id: id ?? crypto.randomUUID(),
      name: rq.name,
      metadata: rq.metadata,  // Already typed from API schema
    })
  }

  static fromRecord(record: UserRecord): UserEntity {
    // Parse JSON string from TEXT column
    let metadata: UserMetadata | undefined
    if (record.metadata) {
      metadata = JSON.parse(record.metadata)
    }

    return new UserEntity({
      id: record.id,
      name: record.name,
      metadata,
    })
  }

  toRecord(): UserInsert {
    return {
      id: this.id,
      name: this.name,
      // Serialize to JSON string for TEXT column
      metadata: this.metadata ? JSON.stringify(this.metadata) : undefined,
    }
  }

  toResponse(): UserResponse {
    return {
      id: this.id,
      name: this.name,
      metadata: this.metadata,  // Send as object
    }
  }
}
```

## Entity with Business Logic

Entities can contain domain logic that operates on their data:

```typescript
import { TypeID } from 'typeid-js'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { ledgerAccounts } from '../schema'

type LedgerAccountID = TypeID<'lat'>
type LedgerAccountRecord = InferSelectModel<typeof ledgerAccounts>
type LedgerAccountInsert = InferInsertModel<typeof ledgerAccounts>

export class LedgerAccountEntity {
  public readonly id: LedgerAccountID
  public readonly name: string
  public readonly normalBalance: 'debit' | 'credit'
  public readonly postedAmount: number
  public readonly lockVersion: number
  public readonly updated: Date

  private constructor(data: {
    id: LedgerAccountID
    name: string
    normalBalance: 'debit' | 'credit'
    postedAmount: number
    lockVersion: number
    updated: Date
  }) {
    Object.assign(this, data)
  }

  static fromRecord(record: LedgerAccountRecord): LedgerAccountEntity {
    return new LedgerAccountEntity({
      id: TypeID.fromString<'lat'>(record.id),
      name: record.name,
      normalBalance: record.normalBalance as 'debit' | 'credit',
      postedAmount: record.postedAmount,
      lockVersion: record.lockVersion,
      updated: record.updated,
    })
  }

  /**
   * Apply a transaction entry and return a new immutable entity.
   * Uses double-entry accounting rules based on the account's normal balance.
   */
  applyEntry(entry: {
    direction: 'debit' | 'credit'
    amount: number
  }): LedgerAccountEntity {
    let newPostedAmount = this.postedAmount

    if (this.normalBalance === 'debit') {
      if (entry.direction === 'debit') {
        newPostedAmount += entry.amount  // Debit increases debit accounts
      } else {
        newPostedAmount -= entry.amount  // Credit decreases debit accounts
      }
    } else {
      // credit normal balance
      if (entry.direction === 'credit') {
        newPostedAmount += entry.amount  // Credit increases credit accounts
      } else {
        newPostedAmount -= entry.amount  // Debit decreases credit accounts
      }
    }

    // Return new immutable instance
    return new LedgerAccountEntity({
      ...this,
      postedAmount: newPostedAmount,
      updated: new Date(),
    })
  }

  toRecord(): LedgerAccountInsert {
    return {
      id: this.id.toString(),
      name: this.name,
      normalBalance: this.normalBalance,
      postedAmount: this.postedAmount,
      lockVersion: this.lockVersion,
      updated: this.updated,
    }
  }

  toResponse(): LedgerAccountResponse {
    return {
      id: this.id.toString(),
      name: this.name,
      normalBalance: this.normalBalance,
      postedAmount: this.postedAmount,
      updated: this.updated.toISOString(),
    }
  }
}
```

## Entity with Defaults

Handle default values consistently:

```typescript
export class LedgerEntity {
  public readonly id: LedgerID
  public readonly organizationId: OrgID
  public readonly name: string
  public readonly currency: string
  public readonly currencyExponent: number
  public readonly metadata?: Record<string, unknown>

  private constructor(data: LedgerEntityData) {
    Object.assign(this, data)
  }

  static fromRequest(
    rq: LedgerRequest,
    organizationId: OrgID,
    id?: string
  ): LedgerEntity {
    return new LedgerEntity({
      id: id ? TypeID.fromString<'lgr'>(id) : new TypeID('lgr'),
      organizationId,
      name: rq.name,
      currency: rq.currency ?? 'USD',  // Apply default
      currencyExponent: rq.currencyExponent ?? 2,  // Apply default
      metadata: rq.metadata,
    })
  }

  static fromRecord(record: LedgerRecord): LedgerEntity {
    let metadata: Record<string, unknown> | undefined
    if (record.metadata) {
      metadata = JSON.parse(record.metadata)
    }

    return new LedgerEntity({
      id: TypeID.fromString<'lgr'>(record.id),
      organizationId: TypeID.fromString<'org'>(record.organizationId),
      name: record.name,
      currency: record.currency,
      currencyExponent: record.currencyExponent,
      metadata,
    })
  }

  toRecord(): LedgerInsert {
    return {
      id: this.id.toString(),
      organizationId: this.organizationId.toString(),
      name: this.name,
      currency: this.currency,
      currencyExponent: this.currencyExponent,
      metadata: this.metadata ? JSON.stringify(this.metadata) : undefined,
    }
  }

  toResponse(): LedgerResponse {
    return {
      id: this.id.toString(),
      name: this.name,
      currency: this.currency,
      currencyExponent: this.currencyExponent,
      metadata: this.metadata,
    }
  }
}
```

## Guidelines

1. **Use immutable readonly properties** - Prevents accidental mutation
2. **Private constructor** - Forces use of factory methods (fromRequest, fromRecord)
3. **Four transformation methods** - Clear contracts for each layer boundary
4. **Business logic in entities** - Domain rules belong in entities, not repos or services
5. **Return new instances** - When applying changes, return new entity (immutability)
6. **Parse JSON in fromRecord** - Handle TEXT → object deserialization
7. **Stringify JSON in toRecord** - Handle object → TEXT serialization
8. **Format dates in toResponse** - Convert Date → ISO string for API
9. **Apply defaults in fromRequest** - Ensure defaults are set when creating from API
10. **Use TypeID for type safety** - Prevents ID mixups across entity types
