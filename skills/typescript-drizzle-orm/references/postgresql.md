# PostgreSQL Patterns with Drizzle ORM

PostgreSQL-specific patterns, connection setup, and error handling.

## Schema Definition

```typescript
import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  varchar,
  uuid,
  primaryKey,
  unique,
  index
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  age: integer('age'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
})

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

## Database Connection

```typescript
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const db = drizzle(pool, { schema })
```

## Migrations (drizzle-kit)

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

```bash
# Generate migration
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate

# Open Drizzle Studio
npx drizzle-kit studio

# Pull schema from existing DB
npx drizzle-kit pull
```

## Column Helpers

```typescript
// UUID with auto-generation
id: uuid('id').defaultRandom().primaryKey()

// Timestamps
createdAt: timestamp('created_at').defaultNow().notNull()
updatedAt: timestamp('updated_at').$onUpdate(() => new Date())

// Enum
import { pgEnum } from 'drizzle-orm/pg-core'
export const statusEnum = pgEnum('status', ['pending', 'active', 'archived'])
// usage: status: statusEnum('status').default('pending')

// JSON
metadata: jsonb('metadata').$type<{ key: string }>()
```

## Composite Keys & Indexes

```typescript
export const postTags = pgTable('post_tags', {
  postId: integer('post_id').references(() => posts.id),
  tagId: integer('tag_id').references(() => tags.id),
}, (t) => [
  primaryKey({ columns: [t.postId, t.tagId] }),
])

export const users = pgTable('users', {
  // columns...
}, (t) => [
  unique('unique_email').on(t.email),
  index('name_idx').on(t.name),
])
```

## PostgreSQL Error Codes

Map database error codes to domain errors:

```typescript
type ErrorContext = {
  userId?: string
  resourceId?: string
  [key: string]: unknown
}

function handleDBError(error: unknown, context: ErrorContext = {}): never {
  const code = (error as { code?: string }).code

  switch (code) {
    case '23505': // unique_violation
      throw new ConflictError('Resource already exists', context)
    case '23503': // foreign_key_violation
      throw new NotFoundError('Referenced resource not found', context)
    case '40001': // serialization_failure
      throw new ServiceUnavailableError('Transaction conflict - please retry', {
        retryable: true,
        ...context,
      })
    case 'OC000': // AWS DSQL occ_conflict
      throw new ServiceUnavailableError('Optimistic concurrency conflict', {
        retryable: true,
        ...context,
      })
    default:
      throw error
  }
}
```

## Optimistic Locking

Prevent concurrent modification issues with version-based locking:

```typescript
// Add lockVersion column to schema
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  lockVersion: integer('lock_version').default(0).notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
})

// Update with version check
async update(entity: UserEntity): Promise<UserEntity> {
  const result = await this.db
    .update(users)
    .set({
      ...entity.toRecord(),
      lockVersion: sql`${users.lockVersion} + 1`,
    })
    .where(and(
      eq(users.id, entity.id),
      eq(users.lockVersion, entity.lockVersion)
    ))
    .returning()

  if (result.length === 0) {
    throw new ConflictError({
      message: 'Resource was modified by another transaction',
      retryable: true,
    })
  }
  return UserEntity.fromRecord(result[0])
}
```
