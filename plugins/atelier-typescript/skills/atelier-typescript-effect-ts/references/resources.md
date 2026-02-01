# Resource Management in Effect

Effect provides powerful primitives for managing resources that need cleanup, ensuring they're always released even on failure or interruption.

## acquireRelease - Basic Resource Pattern

The core pattern for resource management:

```typescript
import { Effect } from "effect"

// Define a resource with acquisition and release
const withFile = (path: string) =>
  Effect.acquireRelease(
    // Acquire: runs to get the resource
    Effect.sync(() => {
      console.log(`Opening file: ${path}`)
      return { path, handle: fs.openSync(path, "r") }
    }),
    // Release: always runs when scope closes
    (file) => Effect.sync(() => {
      console.log(`Closing file: ${file.path}`)
      fs.closeSync(file.handle)
    })
  )
```

### Using Resources with Scope

```typescript
import { Effect } from "effect"

// Effect.scoped provides a scope and runs release after use
const program = Effect.scoped(
  Effect.gen(function* () {
    const file = yield* withFile("/path/to/file")
    const content = yield* readFile(file)
    return content
  })
)
// File is automatically closed after reading

Effect.runPromise(program)
```

### Resource Guarantees

- **Release always runs** - Even if the using code fails or throws
- **Release runs on interruption** - If the fiber is interrupted
- **Typed errors** - Release errors are tracked in the type system

## acquireUseRelease - Inline Pattern

For one-off resource usage:

```typescript
import { Effect } from "effect"

const readConfig = Effect.acquireUseRelease(
  // Acquire
  Effect.sync(() => fs.openSync("config.json", "r")),
  // Use
  (handle) => Effect.sync(() => {
    const content = fs.readFileSync(handle, "utf-8")
    return JSON.parse(content)
  }),
  // Release
  (handle) => Effect.sync(() => fs.closeSync(handle))
)

// No explicit scoping needed - handled internally
const config = await Effect.runPromise(readConfig)
```

## Multiple Resources

### Sequential Acquisition

```typescript
import { Effect } from "effect"

const program = Effect.scoped(
  Effect.gen(function* () {
    // Resources acquired in order
    const db = yield* withDatabaseConnection()
    const cache = yield* withCacheConnection()
    const queue = yield* withMessageQueue()

    // Use all three...
    yield* doWork(db, cache, queue)

    // Released in reverse order: queue → cache → db
  })
)
```

### Parallel Acquisition

```typescript
import { Effect } from "effect"

const program = Effect.scoped(
  Effect.gen(function* () {
    // Acquire resources in parallel
    const [db, cache, queue] = yield* Effect.all([
      withDatabaseConnection(),
      withCacheConnection(),
      withMessageQueue()
    ], { concurrency: "unbounded" })

    yield* doWork(db, cache, queue)
  })
)
```

## Scope - Manual Control

For more control over resource lifecycle:

```typescript
import { Effect, Scope } from "effect"

const program = Effect.gen(function* () {
  // Create a manual scope
  const scope = yield* Scope.make()

  // Add resources to scope
  const db = yield* Scope.extend(scope)(withDatabaseConnection())
  const cache = yield* Scope.extend(scope)(withCacheConnection())

  // Use resources...
  yield* doWork(db, cache)

  // Manually close scope when done
  yield* Scope.close(scope, Exit.succeed(void 0))
})
```

### Scope Forking

```typescript
import { Effect, Scope } from "effect"

const program = Effect.gen(function* () {
  // Fork scope to create child scope
  const parentScope = yield* Effect.scope
  const childScope = yield* Scope.fork(parentScope)

  // Resources in child scope
  const tempFile = yield* Scope.extend(childScope)(withTempFile())

  // Close child scope (releases tempFile)
  yield* Scope.close(childScope, Exit.succeed(void 0))

  // Parent scope continues...
})
```

## Resource Finalization

### Ensuring Finalization

```typescript
import { Effect } from "effect"

const program = Effect.gen(function* () {
  yield* doWork()
}).pipe(
  // Runs regardless of success/failure
  Effect.ensuring(
    Effect.sync(() => console.log("Cleanup complete"))
  )
)
```

### onExit - Conditional Finalization

```typescript
import { Effect, Exit } from "effect"

const program = effect.pipe(
  Effect.onExit((exit) => {
    if (Exit.isSuccess(exit)) {
      return Effect.sync(() => console.log("Success:", exit.value))
    } else {
      return Effect.sync(() => console.log("Failed:", exit.cause))
    }
  })
)
```

### addFinalizer - Add to Current Scope

```typescript
import { Effect } from "effect"

const program = Effect.scoped(
  Effect.gen(function* () {
    // Add finalizer to current scope
    yield* Effect.addFinalizer((exit) =>
      Effect.sync(() => {
        console.log("Cleaning up, exit was:", Exit.isSuccess(exit))
      })
    )

    yield* doWork()
  })
)
```

## Common Resource Patterns

### Database Connection Pool

```typescript
import { Effect, Layer, Scope } from "effect"

interface ConnectionPool {
  getConnection: () => Effect.Effect<Connection, PoolError>
  release: (conn: Connection) => Effect.Effect<void>
}

const makeConnectionPool = (config: PoolConfig) =>
  Effect.acquireRelease(
    // Create pool
    Effect.sync(() => {
      console.log("Creating connection pool...")
      return {
        connections: [] as Connection[],
        getConnection: () => Effect.sync(() => createConnection()),
        release: (conn) => Effect.sync(() => releaseToPool(conn))
      }
    }),
    // Close all connections
    (pool) => Effect.sync(() => {
      console.log("Closing all pool connections...")
      pool.connections.forEach(conn => conn.close())
    })
  )

const ConnectionPoolLive = Layer.scoped(
  ConnectionPool,
  makeConnectionPool({ size: 10 })
)
```

### File Handle

```typescript
import { Effect } from "effect"
import * as fs from "fs/promises"

const withFile = (path: string, flags: string) =>
  Effect.acquireRelease(
    Effect.tryPromise({
      try: () => fs.open(path, flags),
      catch: (e) => new FileOpenError(path, e)
    }),
    (handle) => Effect.promise(() => handle.close())
  )

const readFile = (path: string) =>
  Effect.scoped(
    Effect.gen(function* () {
      const handle = yield* withFile(path, "r")
      const content = yield* Effect.tryPromise({
        try: () => handle.readFile("utf-8"),
        catch: (e) => new FileReadError(path, e)
      })
      return content
    })
  )
```

### HTTP Client with Cleanup

```typescript
import { Effect } from "effect"

const withHttpClient = Effect.acquireRelease(
  Effect.sync(() => {
    console.log("Creating HTTP client...")
    return new HttpClient({
      timeout: 30000,
      keepAlive: true
    })
  }),
  (client) => Effect.sync(() => {
    console.log("Destroying HTTP client...")
    client.destroy()
  })
)

const fetchData = (url: string) =>
  Effect.scoped(
    Effect.gen(function* () {
      const client = yield* withHttpClient
      const response = yield* Effect.tryPromise({
        try: () => client.get(url),
        catch: (e) => new FetchError(url, e)
      })
      return response.data
    })
  )
```

### Temporary Directory

```typescript
import { Effect } from "effect"
import * as fs from "fs/promises"
import * as os from "os"
import * as path from "path"

const withTempDir = Effect.acquireRelease(
  Effect.tryPromise({
    try: async () => {
      const dir = await fs.mkdtemp(path.join(os.tmpdir(), "app-"))
      console.log(`Created temp dir: ${dir}`)
      return dir
    },
    catch: (e) => new TempDirError(e)
  }),
  (dir) => Effect.tryPromise({
    try: async () => {
      console.log(`Removing temp dir: ${dir}`)
      await fs.rm(dir, { recursive: true, force: true })
    },
    catch: () => void 0 // Ignore cleanup errors
  })
)

const processWithTempFiles = Effect.scoped(
  Effect.gen(function* () {
    const tempDir = yield* withTempDir

    // Create temp files in directory
    const tempFile = path.join(tempDir, "data.json")
    yield* Effect.tryPromise({
      try: () => fs.writeFile(tempFile, JSON.stringify(data)),
      catch: (e) => new WriteError(e)
    })

    // Process...
    const result = yield* processFile(tempFile)

    return result
    // Temp dir and all contents deleted automatically
  })
)
```

### Lock/Mutex

```typescript
import { Effect, Ref, Deferred } from "effect"

const withLock = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const lock = yield* Ref.make(false)

    // Acquire lock
    yield* Effect.repeatUntil(
      Ref.getAndSet(lock, true),
      (acquired) => acquired === false
    )

    // Use with guaranteed release
    return yield* effect.pipe(
      Effect.ensuring(Ref.set(lock, false))
    )
  })
```

## Interruption Safety

### Making Resources Interruption-Safe

```typescript
import { Effect } from "effect"

const criticalOperation = Effect.gen(function* () {
  const resource = yield* acquireResource()

  // This section cannot be interrupted
  yield* Effect.uninterruptible(
    Effect.gen(function* () {
      yield* step1(resource)
      yield* step2(resource)
      yield* step3(resource)
    })
  )

  yield* releaseResource(resource)
})
```

### Interruptible Regions

```typescript
import { Effect } from "effect"

const program = Effect.uninterruptible(
  Effect.gen(function* () {
    yield* criticalSetup()

    // Allow interruption in this region
    yield* Effect.interruptible(
      longRunningTask()
    )

    yield* criticalCleanup()
  })
)
```

## Best Practices

1. **Use acquireRelease for resources** - Never rely on manual cleanup
2. **Scope resources appropriately** - Keep scopes as small as practical
3. **Order matters** - Resources release in reverse acquisition order
4. **Handle release errors** - Release should not throw; log and continue
5. **Use Layer.scoped for services** - Service lifecycle tied to app lifecycle
6. **Test resource cleanup** - Verify resources release on failure paths
7. **Avoid nested scopes when possible** - Flatten for clarity
8. **Make critical sections uninterruptible** - Protect invariants

## Common Mistakes

### Forgetting to Scope

```typescript
// Bad: resource never released
const bad = Effect.gen(function* () {
  const file = yield* withFile("data.txt")
  return yield* readContent(file)
})

// Good: scoped ensures release
const good = Effect.scoped(
  Effect.gen(function* () {
    const file = yield* withFile("data.txt")
    return yield* readContent(file)
  })
)
```

### Releasing in Acquire

```typescript
// Bad: release in acquire, not as finalizer
const bad = Effect.sync(() => {
  const conn = createConnection()
  return { conn, close: () => conn.close() } // Caller must remember
})

// Good: automatic release
const good = Effect.acquireRelease(
  Effect.sync(() => createConnection()),
  (conn) => Effect.sync(() => conn.close())
)
```

### Swallowing Release Errors

```typescript
// Acceptable: log but don't fail
const resource = Effect.acquireRelease(
  acquire,
  (r) => release(r).pipe(
    Effect.catchAll((error) =>
      Effect.sync(() => console.error("Release error:", error))
    )
  )
)
```
