# SQLite Patterns with Drizzle ORM

SQLite-specific patterns, schema definition, and local testing with better-sqlite3.

## Schema Definition

```typescript
import {
  sqliteTable,
  text,
  integer,
  blob,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  age: integer('age'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(), // ISO 8601 string
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  uniqueIndex('idx_users_email').on(table.email),
])

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  authorId: text('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_posts_author').on(table.authorId),
])
```

## Key Differences from PostgreSQL

| Feature | PostgreSQL | SQLite |
|---------|-----------|--------|
| Primary Key | `serial('id').primaryKey()` | `integer('id').primaryKey({ autoIncrement: true })` or `text('id').primaryKey()` |
| UUID | `uuid('id').defaultRandom()` | `text('id')` (generate in app) |
| Timestamp | `timestamp('created_at').defaultNow()` | `text('created_at')` (ISO 8601) or `integer({ mode: 'timestamp' })` |
| Boolean | `boolean('is_active')` | `integer('is_active', { mode: 'boolean' })` |
| JSON | `jsonb('metadata')` | `text('metadata')` or `blob('metadata', { mode: 'json' })` |
| Enum | `pgEnum()` | `text('type', { enum: ['A', 'B'] })` |
| Binary | `bytea('data')` | `blob('data')` |

## Column Types

### Integer Modes

```typescript
// Default (number)
age: integer('age')

// Boolean
isActive: integer('is_active', { mode: 'boolean' })

// Unix timestamp (seconds)
createdAt: integer('created_at', { mode: 'timestamp' })

// Unix timestamp (milliseconds)
createdAt: integer('created_at', { mode: 'timestamp_ms' })
```

### Text Enums

```typescript
// Type-safe enum with inference
type: text('type', { enum: ['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE'] }).notNull()

// Inferred as: "ASSET" | "LIABILITY" | "INCOME" | "EXPENSE"
```

### Blob Types

```typescript
// Buffer mode (default)
data: blob('data')

// JSON mode
metadata: blob('metadata', { mode: 'json' }).$type<{ key: string }>()

// BigInt mode
bigNumber: blob('big_number', { mode: 'bigint' })
```

## Indexes and Constraints

```typescript
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  parentId: text('parent_id'),
}, (table) => [
  // Unique index
  uniqueIndex('idx_accounts_code').on(table.code),
  // Regular index
  index('idx_accounts_parent').on(table.parentId),
  // Composite index
  index('idx_accounts_code_parent').on(table.code, table.parentId),
])

// Composite primary key
export const postTags = sqliteTable('post_tags', {
  postId: text('post_id').notNull().references(() => posts.id),
  tagId: text('tag_id').notNull().references(() => tags.id),
}, (table) => [
  primaryKey({ columns: [table.postId, table.tagId] }),
])
```

## Migrations Configuration

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './local.db', // File path for local SQLite
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
```

## Local Testing with better-sqlite3

For D1 apps or local development, use `better-sqlite3` for fast in-memory testing:

```typescript
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'

// In-memory database (fast, isolated tests)
const sqlite = new Database(':memory:')
const db = drizzle(sqlite, { schema })

// Run migrations
migrate(db, { migrationsFolder: './drizzle' })

// Use in tests
test('user creation', async () => {
  const [user] = await db.insert(schema.users).values({
    id: crypto.randomUUID(),
    name: 'Alice',
    email: 'alice@example.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).returning()

  expect(user.name).toBe('Alice')
})
```

### File-Based Database

```typescript
// Persistent database file
const sqlite = new Database('./test.db')
const db = drizzle(sqlite, { schema })
```

### Test Setup Helper

```typescript
import { beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

let sqlite: Database.Database
let db: ReturnType<typeof drizzle>

beforeEach(() => {
  sqlite = new Database(':memory:')
  db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: './drizzle' })
})

afterEach(() => {
  sqlite.close()
})

export { db }
```

## Date Handling

SQLite doesn't have native date types. Use ISO 8601 strings or Unix timestamps:

```typescript
// ISO 8601 strings (recommended)
createdAt: text('created_at').notNull()
// Store: new Date().toISOString()
// Parse: new Date(record.createdAt)

// Unix timestamps (integer)
createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
// Store: Math.floor(Date.now() / 1000)
// Parse: new Date(record.createdAt * 1000)
```

## Schema Design Patterns

### UUID Primary Keys

```typescript
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // Generate with crypto.randomUUID()
  name: text('name').notNull(),
})

// In your entity or repository
const id = crypto.randomUUID()
await db.insert(users).values({ id, name: 'Alice' })
```

### Auto-Increment Integer Keys

```typescript
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
})

// SQLite generates the ID
const [user] = await db.insert(users).values({ name: 'Alice' }).returning()
console.log(user.id) // 1, 2, 3, ...
```

### Hierarchical Data

```typescript
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  parentId: text('parent_id'),
}, (table) => [
  index('idx_categories_parent').on(table.parentId),
])

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'parentChild',
  }),
  children: many(categories, {
    relationName: 'parentChild',
  }),
}))
```

## When to Use SQLite

- **Embedded applications** - Desktop, mobile, edge computing
- **Single-writer scenarios** - One process writes, multiple read
- **Cloudflare D1** - Managed SQLite for Workers
- **Durable Objects** - Per-object isolated storage
- **Local development** - Fast, zero-config testing
- **Small to medium datasets** - Under 1TB

## Limitations

- No concurrent writers (one writer at a time)
- Limited network access (file-based)
- No stored procedures
- No built-in replication (use D1 or Turso for distributed)
