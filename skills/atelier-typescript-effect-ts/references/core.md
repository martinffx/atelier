# Effect Core Concepts

The Effect type is the foundation of the Effect-TS library. It represents a computation that can succeed, fail, or require dependencies.

## The Effect Type

```typescript
Effect<Success, Error, Requirements>
```

- **Success (A)**: The type of value produced on success
- **Error (E)**: The type of error that may occur (use `never` if cannot fail)
- **Requirements (R)**: The context/services required to run (use `never` if none)

### Type Examples

```typescript
import { Effect } from "effect"

// Succeeds with number, cannot fail, no requirements
type PureComputation = Effect.Effect<number>
// Equivalent to: Effect.Effect<number, never, never>

// May fail with Error, no requirements
type FallibleComputation = Effect.Effect<string, Error>
// Equivalent to: Effect.Effect<string, Error, never>

// Requires Database service, may fail with DbError
type ServiceComputation = Effect.Effect<User, DbError, Database>
```

## Creating Effects

### From Values (Synchronous)

```typescript
import { Effect } from "effect"

// Always succeeds with given value
const succeed = Effect.succeed(42)
// Effect<number, never, never>

// Lazy evaluation - thunk called when effect runs
const sync = Effect.sync(() => {
  console.log("Computing...")
  return Date.now()
})
// Effect<number, never, never>

// Suspend effect creation (useful for recursion)
const suspend = Effect.suspend(() => Effect.succeed(42))
```

### From Failures

```typescript
import { Effect } from "effect"

// Typed error (recoverable)
const fail = Effect.fail(new Error("Something went wrong"))
// Effect<never, Error, never>

// Defect (unrecoverable, not in error type)
const die = Effect.die("Unexpected error")
// Effect<never, never, never> - defects aren't tracked in E

// Die if condition not met
const dieIf = Effect.dieIf(value === null, "Value was null")
```

### From Try/Catch

```typescript
import { Effect } from "effect"

// Wrap throwing code
const tryEffect = Effect.try({
  try: () => JSON.parse(invalidJson),
  catch: (error) => new ParseError(String(error))
})
// Effect<unknown, ParseError, never>

// Simpler form (wraps with UnknownException)
const trySimple = Effect.try(() => JSON.parse(json))
// Effect<unknown, UnknownException, never>
```

### From Promises

```typescript
import { Effect } from "effect"

// From promise with error mapping
const tryPromise = Effect.tryPromise({
  try: () => fetch("/api/users").then(r => r.json()),
  catch: (error) => new FetchError(String(error))
})
// Effect<unknown, FetchError, never>

// From promise (wraps rejection with UnknownException)
const promise = Effect.promise(() => fetch("/api/users"))
// Effect<Response, UnknownException, never>
```

### From Nullable Values

```typescript
import { Effect } from "effect"

// Convert nullable to Effect
const fromNullable = Effect.fromNullable(value)
// Effect<T, NoSuchElementException, never>

// With custom error
const fromNullableWithError = Effect.fromNullable(value).pipe(
  Effect.mapError(() => new ValueNotFound())
)
```

### From Either/Option

```typescript
import { Effect, Either, Option } from "effect"

// From Either
const either: Either.Either<number, string> = Either.right(42)
const fromEither = Effect.fromEither(either)
// Effect<number, string, never>

// From Option
const option: Option.Option<number> = Option.some(42)
const fromOption = Effect.fromOption(option)
// Effect<number, NoSuchElementException, never>
```

## Running Effects

### Synchronous Execution

```typescript
import { Effect } from "effect"

const program = Effect.succeed(42)

// Run synchronously - throws if async or fails
const result = Effect.runSync(program) // 42

// Run with exit status
const exit = Effect.runSyncExit(program)
// Exit<number, never>
```

**Warning**: `runSync` throws if the effect:
- Contains async operations
- Fails with an error
- Requires services not provided

### Promise-based Execution

```typescript
import { Effect } from "effect"

const program = Effect.succeed(42)

// Returns Promise that rejects on failure
const promise = Effect.runPromise(program)
// Promise<number>

// Returns Promise<Exit> (never rejects)
const exitPromise = Effect.runPromiseExit(program)
// Promise<Exit<number, never>>
```

### Fiber-based Execution

```typescript
import { Effect } from "effect"

// Fork to run in background
const fiber = Effect.runFork(program)

// Join to await result
const result = await Effect.runPromise(Fiber.join(fiber))

// Interrupt if needed
await Effect.runPromise(Fiber.interrupt(fiber))
```

## Effect.gen Generators

Generators provide async/await-like syntax with full type safety:

```typescript
import { Effect } from "effect"

// Basic generator pattern
const program = Effect.gen(function* () {
  const a = yield* Effect.succeed(1)
  const b = yield* Effect.succeed(2)
  return a + b
})
// Effect<number, never, never>

// With error handling
const withErrors = Effect.gen(function* () {
  const user = yield* fetchUser(userId)
  // If fetchUser fails, error propagates automatically
  const posts = yield* fetchPosts(user.id)
  return { user, posts }
})
```

### Generator vs Pipe Style

```typescript
// Generator style - more readable for sequential operations
const genStyle = Effect.gen(function* () {
  const user = yield* getUser(id)
  const profile = yield* getProfile(user.id)
  const settings = yield* getSettings(user.id)
  return { user, profile, settings }
})

// Pipe style - useful for transformations
const pipeStyle = getUser(id).pipe(
  Effect.flatMap(user => getProfile(user.id).pipe(
    Effect.flatMap(profile => getSettings(user.id).pipe(
      Effect.map(settings => ({ user, profile, settings }))
    ))
  ))
)

// Both produce the same result
```

### Early Return in Generators

```typescript
import { Effect } from "effect"

const program = Effect.gen(function* () {
  const user = yield* getUser(id)

  // Early return with fail
  if (!user.isActive) {
    return yield* Effect.fail(new UserInactive(id))
  }

  const data = yield* loadUserData(user)
  return data
})
```

## Pipe and Composition

### Basic Pipe

```typescript
import { Effect, pipe } from "effect"

// Using .pipe method
const result = Effect.succeed(1).pipe(
  Effect.map(n => n + 1),
  Effect.map(n => n * 2)
)

// Using pipe function
const result2 = pipe(
  Effect.succeed(1),
  Effect.map(n => n + 1),
  Effect.map(n => n * 2)
)
```

### Common Operators

```typescript
import { Effect } from "effect"

// Transform success value
const mapped = effect.pipe(
  Effect.map(value => value.toUpperCase())
)

// Chain effects
const chained = effect.pipe(
  Effect.flatMap(value => anotherEffect(value))
)

// Transform error
const mappedError = effect.pipe(
  Effect.mapError(error => new WrappedError(error))
)

// Transform both
const mapBoth = effect.pipe(
  Effect.mapBoth({
    onSuccess: value => value.toUpperCase(),
    onFailure: error => new WrappedError(error)
  })
)

// Run side effect without changing value
const tapped = effect.pipe(
  Effect.tap(value => Effect.sync(() => console.log(value)))
)

// Run side effect on error
const tappedError = effect.pipe(
  Effect.tapError(error => Effect.sync(() => console.error(error)))
)
```

### Combining Multiple Effects

```typescript
import { Effect } from "effect"

const effects = [effect1, effect2, effect3]

// Run all, collect results (fails fast on first error)
const all = Effect.all(effects)
// Effect<[A1, A2, A3], E, R>

// Run all, collect only successes
const allSuccesses = Effect.allSuccesses(effects)
// Effect<A[], never, R>

// Run first to succeed
const race = Effect.race(effect1, effect2)

// Run both, return tuple
const zip = Effect.zip(effect1, effect2)
// Effect<[A1, A2], E1 | E2, R1 | R2>

// Run both, combine results
const zipWith = Effect.zipWith(
  effect1,
  effect2,
  (a, b) => a + b
)
```

### Concurrency Control

```typescript
import { Effect } from "effect"

const tasks = [task1, task2, task3, task4, task5]

// Sequential (one at a time)
const sequential = Effect.all(tasks, { concurrency: 1 })

// Parallel (all at once)
const parallel = Effect.all(tasks, { concurrency: "unbounded" })

// Limited parallelism
const limited = Effect.all(tasks, { concurrency: 3 })

// Inherit from context
const inherited = Effect.all(tasks, { concurrency: "inherit" })
```

## Interop with Async/Await

### Using Effect in Async Functions

```typescript
// Call Effect from async function
async function main() {
  const result = await Effect.runPromise(myEffect)
  console.log(result)
}

// Handle exit for error details
async function mainWithExit() {
  const exit = await Effect.runPromiseExit(myEffect)
  if (Exit.isSuccess(exit)) {
    console.log("Success:", exit.value)
  } else {
    console.error("Failure:", exit.cause)
  }
}
```

### Wrapping Async Functions

```typescript
import { Effect } from "effect"

// Wrap existing async function
const fetchUserEffect = (id: string) =>
  Effect.tryPromise({
    try: () => fetchUser(id), // existing async function
    catch: (error) => new FetchError(String(error))
  })

// Use in Effect.gen
const program = Effect.gen(function* () {
  const user = yield* fetchUserEffect("123")
  return user
})
```

## Best Practices

1. **Keep effects lazy** - Don't run effects until necessary
2. **Use generators for sequential code** - More readable than nested flatMap
3. **Prefer specific error types** - Use tagged classes over generic Error
4. **Run at the edge** - Call `runPromise`/`runSync` only at application boundaries
5. **Compose with pipe** - Build complex effects from simple ones
6. **Use appropriate concurrency** - Don't default to unbounded parallelism
