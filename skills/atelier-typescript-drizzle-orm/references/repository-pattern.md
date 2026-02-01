# Repository Pattern

Repositories wrap database access, providing a clean abstraction layer with error handling, validation, and business logic.

## Core Concept

Repositories:
- Encapsulate all database operations for an entity
- Transform between records and entities using entity methods
- Handle database errors and convert to domain errors
- Enforce multi-tenancy and authorization boundaries
- Manage optimistic locking and retries

## Basic Repository

```typescript
import { eq, and } from 'drizzle-orm'
import type { DrizzleDB } from '../db'
import { users } from '../schema'
import { UserEntity } from '../entities/UserEntity'
import { NotFoundError } from '../errors'

export class UserRepo {
  constructor(private db: DrizzleDB) {}

  async getById(id: string): Promise<UserEntity> {
    const record = await this.db.query.users.findFirst({
      where: eq(users.id, id),
    })

    if (!record) {
      throw new NotFoundError('User not found', { userId: id })
    }

    return UserEntity.fromRecord(record)
  }

  async list(): Promise<UserEntity[]> {
    const records = await this.db.query.users.findMany({
      orderBy: desc(users.createdAt),
    })

    return records.map(UserEntity.fromRecord)
  }

  async create(entity: UserEntity): Promise<UserEntity> {
    const [record] = await this.db
      .insert(users)
      .values(entity.toRecord())
      .returning()

    return UserEntity.fromRecord(record)
  }

  async update(entity: UserEntity): Promise<UserEntity> {
    const [record] = await this.db
      .update(users)
      .set(entity.toRecord())
      .where(eq(users.id, entity.id))
      .returning()

    if (!record) {
      throw new NotFoundError('User not found', { userId: entity.id })
    }

    return UserEntity.fromRecord(record)
  }

  async delete(id: string): Promise<void> {
    const result = await this.db
      .delete(users)
      .where(eq(users.id, id))
      .returning()

    if (result.length === 0) {
      throw new NotFoundError('User not found', { userId: id })
    }
  }
}
```

## Repository with Error Handling

Convert database errors to domain errors:

```typescript
import { eq } from 'drizzle-orm'
import type { DrizzleDB } from '../db'
import { users } from '../schema'
import { UserEntity } from '../entities/UserEntity'
import { handleDBError, NotFoundError } from '../errors'

export class UserRepo {
  constructor(private db: DrizzleDB) {}

  async create(entity: UserEntity): Promise<UserEntity> {
    try {
      const [record] = await this.db
        .insert(users)
        .values(entity.toRecord())
        .returning()

      return UserEntity.fromRecord(record)
    } catch (error) {
      // Maps DB errors (23505, 23503, etc) to domain errors
      throw handleDBError(error, { userId: entity.id })
    }
  }

  async update(entity: UserEntity): Promise<UserEntity> {
    try {
      const [record] = await this.db
        .update(users)
        .set(entity.toRecord())
        .where(eq(users.id, entity.id))
        .returning()

      if (!record) {
        throw new NotFoundError('User not found', { userId: entity.id })
      }

      return UserEntity.fromRecord(record)
    } catch (error) {
      throw handleDBError(error, { userId: entity.id })
    }
  }
}

// Error handler in errors.ts
type ErrorContext = {
  userId?: string
  resourceId?: string
  [key: string]: unknown
}

export function handleDBError(error: unknown, context: ErrorContext = {}): never {
  const code = (error as { code?: string }).code

  switch (code) {
    case '23505': // unique_violation
      throw new ConflictError('Resource already exists', context)
    case '23503': // foreign_key_violation
      throw new NotFoundError('Referenced resource not found', context)
    case '40001': // serialization_failure (Postgres)
      throw new ServiceUnavailableError('Transaction conflict - please retry', {
        retryable: true,
        ...context,
      })
    case 'OC000': // occ_conflict (AWS DSQL)
      throw new ServiceUnavailableError('Optimistic concurrency conflict', {
        retryable: true,
        ...context,
      })
    default:
      throw error
  }
}
```

## Repository with Multi-Tenancy

Enforce organization-level isolation:

```typescript
import { TypeID } from 'typeid-js'
import { eq, and } from 'drizzle-orm'
import type { DrizzleDB } from '../db'
import { ledgers } from '../schema'
import { LedgerEntity } from '../entities/LedgerEntity'
import { NotFoundError } from '../errors'

type OrgID = TypeID<'org'>
type LedgerID = TypeID<'lgr'>

export class LedgerRepo {
  constructor(private db: DrizzleDB) {}

  // ALWAYS include orgId in queries for multi-tenancy
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

  async list(orgId: OrgID): Promise<LedgerEntity[]> {
    const records = await this.db.query.ledgers.findMany({
      where: eq(ledgers.organizationId, orgId.toString()),
      orderBy: desc(ledgers.created),
    })

    return records.map(LedgerEntity.fromRecord)
  }

  async create(entity: LedgerEntity): Promise<LedgerEntity> {
    try {
      const [record] = await this.db
        .insert(ledgers)
        .values(entity.toRecord())
        .returning()

      return LedgerEntity.fromRecord(record)
    } catch (error) {
      throw handleDBError(error, {
        organizationId: entity.organizationId.toString(),
        ledgerId: entity.id.toString(),
      })
    }
  }

  async update(orgId: OrgID, entity: LedgerEntity): Promise<LedgerEntity> {
    try {
      const [record] = await this.db
        .update(ledgers)
        .set(entity.toRecord())
        .where(and(
          eq(ledgers.id, entity.id.toString()),
          eq(ledgers.organizationId, orgId.toString())  // Multi-tenancy check
        ))
        .returning()

      if (!record) {
        throw new NotFoundError('Ledger not found', {
          organizationId: orgId.toString(),
          ledgerId: entity.id.toString(),
        })
      }

      return LedgerEntity.fromRecord(record)
    } catch (error) {
      throw handleDBError(error, {
        organizationId: orgId.toString(),
        ledgerId: entity.id.toString(),
      })
    }
  }

  async delete(orgId: OrgID, ledgerId: LedgerID): Promise<void> {
    const result = await this.db
      .delete(ledgers)
      .where(and(
        eq(ledgers.id, ledgerId.toString()),
        eq(ledgers.organizationId, orgId.toString())  // Multi-tenancy check
      ))
      .returning()

    if (result.length === 0) {
      throw new NotFoundError('Ledger not found', {
        organizationId: orgId.toString(),
        ledgerId: ledgerId.toString(),
      })
    }
  }
}
```

## Repository with Optimistic Locking

Handle concurrent updates safely:

```typescript
import { eq, and, sql } from 'drizzle-orm'
import type { DrizzleDB } from '../db'
import { users } from '../schema'
import { UserEntity } from '../entities/UserEntity'
import { ConflictError, NotFoundError } from '../errors'

export class UserRepo {
  constructor(private db: DrizzleDB) {}

  async update(entity: UserEntity): Promise<UserEntity> {
    try {
      const result = await this.db
        .update(users)
        .set({
          ...entity.toRecord(),
          lockVersion: sql`${users.lockVersion} + 1`,  // Increment version
        })
        .where(and(
          eq(users.id, entity.id),
          eq(users.lockVersion, entity.lockVersion)  // Version check
        ))
        .returning()

      if (result.length === 0) {
        // Either not found or version mismatch
        const exists = await this.db.query.users.findFirst({
          where: eq(users.id, entity.id),
          columns: { id: true, lockVersion: true },
        })

        if (!exists) {
          throw new NotFoundError('User not found', { userId: entity.id })
        }

        // Version mismatch - resource was modified
        throw new ConflictError({
          message: 'Resource was modified by another transaction',
          retryable: true,  // Service layer can retry
          context: {
            userId: entity.id,
            expectedVersion: entity.lockVersion,
            actualVersion: exists.lockVersion,
          },
        })
      }

      return UserEntity.fromRecord(result[0])
    } catch (error) {
      throw handleDBError(error, { userId: entity.id })
    }
  }
}
```

## Repository with Transactions

Complex operations across multiple tables:

```typescript
import { TypeID } from 'typeid-js'
import { eq, and, inArray, sql } from 'drizzle-orm'
import type { DrizzleDB } from '../db'
import {
  ledgerTransactions,
  ledgerTransactionEntries,
  ledgerAccounts,
} from '../schema'
import { LedgerTransactionEntity } from '../entities/LedgerTransactionEntity'
import { LedgerAccountEntity } from '../entities/LedgerAccountEntity'
import { ConflictError } from '../errors'

type OrgID = TypeID<'org'>
type LedgerTransactionID = TypeID<'ltr'>

export class LedgerTransactionRepo {
  constructor(private db: DrizzleDB) {}

  async createTransaction(
    transaction: LedgerTransactionEntity
  ): Promise<LedgerTransactionEntity> {
    // 1. Fetch all affected accounts OUTSIDE transaction
    const accountIds = transaction.entries.map(e => e.accountId.toString())
    const accountRecords = await this.db.select().from(ledgerAccounts)
      .where(inArray(ledgerAccounts.id, accountIds))

    const accountsById = new Map(
      accountRecords.map(r => [r.id, LedgerAccountEntity.fromRecord(r)])
    )

    // 2. Calculate balance updates in-memory using entity business logic
    const updatedAccounts = transaction.entries.map(entry => {
      const account = accountsById.get(entry.accountId.toString())
      if (!account) {
        throw new NotFoundError('Account not found', {
          accountId: entry.accountId.toString(),
        })
      }
      // Entity contains the double-entry accounting logic
      return account.applyEntry(entry)
    })

    // 3. Write atomically in single DB transaction
    return await this.db.transaction(async tx => {
      // Insert transaction record (with upsert for idempotency)
      const [txRecord] = await tx
        .insert(ledgerTransactions)
        .values(transaction.toRecord())
        .onConflictDoUpdate({
          target: ledgerTransactions.idempotencyKey,
          set: { updated: new Date() },
        })
        .returning()

      // Insert transaction entries
      await tx.insert(ledgerTransactionEntries).values(
        transaction.entries.map(e => e.toRecord())
      )

      // Update account balances with optimistic locking
      for (const account of updatedAccounts) {
        const result = await tx
          .update(ledgerAccounts)
          .set({
            ...account.toRecord(),
            lockVersion: sql`${ledgerAccounts.lockVersion} + 1`,
          })
          .where(and(
            eq(ledgerAccounts.id, account.id.toString()),
            eq(ledgerAccounts.lockVersion, account.lockVersion)
          ))
          .returning()

        if (result.length === 0) {
          // Optimistic lock failure - another transaction modified this account
          throw new ConflictError({
            message: `Account ${account.id} was modified by another transaction`,
            retryable: true,  // Service layer will retry entire operation
            context: {
              accountId: account.id.toString(),
              transactionId: transaction.id.toString(),
            },
          })
        }
      }

      return LedgerTransactionEntity.fromRecord(txRecord)
    })
  }
}
```

## Repository with Pagination

Cursor-based pagination for large datasets:

```typescript
import { gt, desc } from 'drizzle-orm'
import type { DrizzleDB } from '../db'
import { posts } from '../schema'
import { PostEntity } from '../entities/PostEntity'

interface PaginatedResult<T> {
  items: T[]
  nextCursor?: string
  hasMore: boolean
}

export class PostRepo {
  constructor(private db: DrizzleDB) {}

  async list(
    limit: number = 20,
    cursor?: string
  ): Promise<PaginatedResult<PostEntity>> {
    const queryLimit = limit + 1  // Fetch one extra to check hasMore

    const records = await this.db.query.posts.findMany({
      where: cursor ? gt(posts.id, cursor) : undefined,
      orderBy: desc(posts.createdAt),
      limit: queryLimit,
    })

    const hasMore = records.length > limit
    const items = records.slice(0, limit).map(PostEntity.fromRecord)
    const nextCursor = hasMore ? records[limit - 1].id : undefined

    return {
      items,
      nextCursor,
      hasMore,
    }
  }
}
```

## Guidelines

1. **Constructor injection** - Pass `db` instance to constructor
2. **Return entities** - Always convert records to entities before returning
3. **Error context** - Include relevant IDs in error context for debugging
4. **Multi-tenancy** - Always filter by `organizationId` when applicable
5. **Optimistic locking** - Use `lockVersion` for resources with concurrent updates
6. **Transactions** - Use `db.transaction()` for multi-step operations
7. **Idempotency** - Use `onConflictDoUpdate` with idempotency keys where applicable
8. **Check returning** - Always check if `.returning()` is empty (means not found)
9. **Pagination** - Use cursor-based pagination for large result sets
10. **Error handling** - Wrap DB operations in try/catch and use `handleDBError()`
