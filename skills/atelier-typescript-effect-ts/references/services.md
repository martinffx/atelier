# Services and Dependency Injection in Effect

Effect provides a powerful dependency injection system using `Context.Tag` for service definitions and `Layer` for service implementations and composition.

## Context.Tag - Defining Services

A Tag uniquely identifies a service and its interface:

```typescript
import { Context, Effect } from "effect"

// Define service interface and tag together
class Database extends Context.Tag("Database")<
  Database,
  {
    readonly query: (sql: string) => Effect.Effect<unknown[]>
    readonly execute: (sql: string) => Effect.Effect<void>
  }
>() {}

// Alternative: separate interface
interface ILogger {
  log: (message: string) => Effect.Effect<void>
  error: (message: string) => Effect.Effect<void>
}

class Logger extends Context.Tag("Logger")<Logger, ILogger>() {}
```

### Tag Naming

Always provide a unique string identifier:

```typescript
// Good - unique string key
class UserService extends Context.Tag("UserService")<...>() {}
class OrderService extends Context.Tag("OrderService")<...>() {}

// Avoid - no identifier (can cause issues with hot reload)
class BadService extends Context.Tag()<...>() {}
```

## Using Services

### Access Service in Effect.gen

```typescript
import { Effect } from "effect"

// Yield the tag to get the service
const getUsers = Effect.gen(function* () {
  const db = yield* Database
  const rows = yield* db.query("SELECT * FROM users")
  return rows
})
// Effect<unknown[], never, Database>

// Multiple services
const logAndQuery = Effect.gen(function* () {
  const db = yield* Database
  const logger = yield* Logger

  yield* logger.log("Querying users...")
  const users = yield* db.query("SELECT * FROM users")
  yield* logger.log(`Found ${users.length} users`)

  return users
})
// Effect<unknown[], never, Database | Logger>
```

### Access Service with pipe

```typescript
import { Effect } from "effect"

const getUsers = Database.pipe(
  Effect.flatMap(db => db.query("SELECT * FROM users"))
)

// Or use Effect.serviceWith
const getUsers2 = Effect.serviceWith(Database, db =>
  db.query("SELECT * FROM users")
)
```

## Layer - Providing Services

Layers are recipes for building services with lifecycle management.

### Simple Layer (No Dependencies)

```typescript
import { Layer } from "effect"

// Layer.succeed for services with no effects or dependencies
const DatabaseLive = Layer.succeed(Database, {
  query: (sql) => Effect.sync(() => {
    console.log(`Query: ${sql}`)
    return []
  }),
  execute: (sql) => Effect.sync(() => {
    console.log(`Execute: ${sql}`)
  })
})
// Layer<Database, never, never>

const LoggerLive = Layer.succeed(Logger, {
  log: (msg) => Effect.sync(() => console.log(msg)),
  error: (msg) => Effect.sync(() => console.error(msg))
})
```

### Layer with Effects

```typescript
import { Layer, Effect } from "effect"

// Layer.effect when construction requires effects
const DatabaseLive = Layer.effect(
  Database,
  Effect.sync(() => {
    console.log("Initializing database connection...")
    return {
      query: (sql) => Effect.sync(() => []),
      execute: (sql) => Effect.sync(() => {})
    }
  })
)
```

### Layer with Dependencies

```typescript
import { Layer, Effect } from "effect"

// Service that depends on another service
class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    readonly findById: (id: string) => Effect.Effect<User | null>
    readonly save: (user: User) => Effect.Effect<void>
  }
>() {}

// Layer that requires Database
const UserRepositoryLive = Layer.effect(
  UserRepository,
  Effect.gen(function* () {
    const db = yield* Database // Dependency

    return {
      findById: (id) => db.query(`SELECT * FROM users WHERE id = '${id}'`).pipe(
        Effect.map(rows => rows[0] as User | null)
      ),
      save: (user) => db.execute(`INSERT INTO users ...`)
    }
  })
)
// Layer<UserRepository, never, Database>
```

### Layer with Resources

```typescript
import { Layer, Effect } from "effect"

// Layer.scoped for services that need cleanup
const ConnectionPoolLive = Layer.scoped(
  ConnectionPool,
  Effect.acquireRelease(
    // Acquire
    Effect.sync(() => {
      console.log("Creating connection pool...")
      return { getConnection: () => Effect.succeed(conn) }
    }),
    // Release
    (pool) => Effect.sync(() => {
      console.log("Closing connection pool...")
    })
  )
)
```

## Composing Layers

### Merge (Combine Independent Layers)

```typescript
import { Layer } from "effect"

// Combine layers that don't depend on each other
const AppLayer = Layer.merge(DatabaseLive, LoggerLive)
// Layer<Database | Logger, never, never>
```

### Provide (Layer Dependencies)

```typescript
import { Layer } from "effect"

// UserRepositoryLive requires Database
// Provide it using Layer.provide

const UserRepositoryWithDb = UserRepositoryLive.pipe(
  Layer.provide(DatabaseLive)
)
// Layer<UserRepository, never, never>

// Build full app layer
const AppLayer = Layer.merge(
  Layer.merge(DatabaseLive, LoggerLive),
  UserRepositoryWithDb
)
```

### Sequential Composition

```typescript
import { Layer } from "effect"

// provideMerge: provide dependencies and include them in output
const AppLayer = UserRepositoryLive.pipe(
  Layer.provideMerge(DatabaseLive)
)
// Layer<UserRepository | Database, never, never>
```

## Running Effects with Layers

### Provide Layer to Effect

```typescript
import { Effect, Layer } from "effect"

const program = Effect.gen(function* () {
  const db = yield* Database
  const logger = yield* Logger
  yield* logger.log("Starting...")
  return yield* db.query("SELECT 1")
})

const AppLayer = Layer.merge(DatabaseLive, LoggerLive)

// Provide layer and run
const runnable = Effect.provide(program, AppLayer)
await Effect.runPromise(runnable)
```

### Provide Multiple Layers

```typescript
const program = Effect.gen(function* () {
  const userRepo = yield* UserRepository
  const logger = yield* Logger
  // ...
})

// Provide layers
const runnable = program.pipe(
  Effect.provide(UserRepositoryLive),
  Effect.provide(DatabaseLive),
  Effect.provide(LoggerLive)
)
```

## Testing with Layers

### Test Implementations

```typescript
import { Layer } from "effect"

// Test implementation
const DatabaseTest = Layer.succeed(Database, {
  query: (sql) => Effect.succeed([
    { id: "1", name: "Test User" }
  ]),
  execute: (sql) => Effect.succeed(undefined)
})

// Use in tests
const TestLayer = Layer.merge(DatabaseTest, LoggerLive)

test("should get users", async () => {
  const result = await Effect.runPromise(
    getUsers.pipe(Effect.provide(TestLayer))
  )
  expect(result).toHaveLength(1)
})
```

### Partial Mocks

```typescript
import { Layer } from "effect"

// Override specific methods
const DatabasePartialMock = Layer.succeed(Database, {
  ...realDatabase, // spread real implementation
  query: (sql) => Effect.succeed([mockData]) // override specific method
})
```

## Service Patterns

### Service with Configuration

```typescript
import { Context, Effect, Layer, Config } from "effect"

interface DatabaseConfig {
  host: string
  port: number
  database: string
}

class DatabaseConfigService extends Context.Tag("DatabaseConfig")<
  DatabaseConfigService,
  DatabaseConfig
>() {}

// Layer that reads from config
const DatabaseConfigLive = Layer.effect(
  DatabaseConfigService,
  Effect.gen(function* () {
    const host = yield* Config.string("DB_HOST")
    const port = yield* Config.number("DB_PORT")
    const database = yield* Config.string("DB_NAME")
    return { host, port, database }
  })
)
```

### Factory Services

```typescript
import { Context, Effect } from "effect"

// Service that creates other things
class UserFactory extends Context.Tag("UserFactory")<
  UserFactory,
  {
    readonly create: (data: CreateUserInput) => Effect.Effect<User, ValidationError>
  }
>() {}

const UserFactoryLive = Layer.succeed(UserFactory, {
  create: (data) => Effect.gen(function* () {
    // Validate
    if (!data.email.includes("@")) {
      return yield* Effect.fail(new ValidationError("Invalid email"))
    }
    // Create
    return {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date()
    }
  })
})
```

### Service Composition

```typescript
import { Context, Effect, Layer } from "effect"

// High-level service composed from others
class UserService extends Context.Tag("UserService")<
  UserService,
  {
    readonly register: (data: RegisterInput) => Effect.Effect<User, RegisterError>
    readonly getProfile: (id: string) => Effect.Effect<UserProfile, NotFoundError>
  }
>() {}

const UserServiceLive = Layer.effect(
  UserService,
  Effect.gen(function* () {
    const userRepo = yield* UserRepository
    const emailService = yield* EmailService
    const logger = yield* Logger

    return {
      register: (data) => Effect.gen(function* () {
        yield* logger.log(`Registering user: ${data.email}`)
        const user = yield* userRepo.save({
          id: crypto.randomUUID(),
          ...data
        })
        yield* emailService.sendWelcome(user.email)
        return user
      }),
      getProfile: (id) => userRepo.findById(id).pipe(
        Effect.flatMap(user =>
          user ? Effect.succeed(toProfile(user)) : Effect.fail(new NotFoundError(id))
        )
      )
    }
  })
)
// Layer<UserService, never, UserRepository | EmailService | Logger>
```

## Layer Lifecycle

### Scoped Layers with Finalization

```typescript
import { Layer, Effect, Scope } from "effect"

const DatabasePoolLive = Layer.scoped(
  DatabasePool,
  Effect.acquireRelease(
    // Acquire: runs when layer is built
    Effect.sync(() => {
      console.log("Creating pool with 10 connections")
      return createPool({ size: 10 })
    }),
    // Release: runs when scope closes
    (pool) => Effect.sync(() => {
      console.log("Closing all connections")
      pool.close()
    })
  )
)

// Resources are cleaned up when program exits
const program = Effect.scoped(
  Effect.gen(function* () {
    const pool = yield* DatabasePool
    // Use pool...
  })
)
```

### Layer Memoization

```typescript
import { Layer } from "effect"

// Layers are memoized by default - built once, shared
const AppLayer = Layer.merge(
  DatabaseLive,
  Layer.merge(UserRepoLive, OrderRepoLive) // Both use same Database
)

// To disable memoization:
const FreshLayer = Layer.fresh(DatabaseLive)
```

## Best Practices

1. **Use string identifiers for tags** - Prevents issues with module reloading
2. **Keep service interfaces small** - Single responsibility per service
3. **Use Layer.scoped for resources** - Ensures proper cleanup
4. **Test with mock layers** - Easy to substitute implementations
5. **Build layers bottom-up** - Satisfy dependencies before composing
6. **Separate live and test layers** - Keep production/test implementations distinct
7. **Use Config for external configuration** - Don't hardcode in layers
