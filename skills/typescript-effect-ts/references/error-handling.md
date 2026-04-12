# Error Handling in Effect

Effect provides comprehensive error handling with typed errors tracked in the type system. Errors are values, not exceptions, enabling exhaustive handling and composition.

## Error Types

### Expected Errors (E channel)

Typed errors that are part of the function contract:

```typescript
import { Effect } from "effect"

class UserNotFound extends Error {
  readonly _tag = "UserNotFound"
  constructor(readonly userId: string) {
    super(`User not found: ${userId}`)
  }
}

class ValidationError extends Error {
  readonly _tag = "ValidationError"
  constructor(readonly field: string, readonly message: string) {
    super(`${field}: ${message}`)
  }
}

// Error type is tracked: Effect<User, UserNotFound | ValidationError, never>
const getUser = (id: string): Effect.Effect<User, UserNotFound | ValidationError> =>
  Effect.gen(function* () {
    if (!isValidId(id)) {
      return yield* Effect.fail(new ValidationError("id", "Invalid format"))
    }
    const user = yield* fetchFromDb(id)
    if (!user) {
      return yield* Effect.fail(new UserNotFound(id))
    }
    return user
  })
```

### Defects (Unexpected Errors)

Untyped errors for bugs and invariant violations:

```typescript
import { Effect } from "effect"

// Die creates a defect - not tracked in E type
const assertPositive = (n: number) =>
  n > 0
    ? Effect.succeed(n)
    : Effect.die(`Expected positive number, got ${n}`)

// Defects propagate but aren't in the error type
const program: Effect.Effect<number> = assertPositive(-1)
// Type says never fails, but will throw at runtime
```

### Tagged Error Pattern

Always use `_tag` for discriminated union handling:

```typescript
// Define error classes with _tag
class NetworkError extends Error {
  readonly _tag = "NetworkError" as const
  constructor(readonly cause: unknown) {
    super("Network error")
  }
}

class TimeoutError extends Error {
  readonly _tag = "TimeoutError" as const
  constructor(readonly ms: number) {
    super(`Timeout after ${ms}ms`)
  }
}

class ParseError extends Error {
  readonly _tag = "ParseError" as const
  constructor(readonly input: string) {
    super(`Failed to parse: ${input}`)
  }
}

type FetchError = NetworkError | TimeoutError | ParseError
```

## Handling Errors

### catchAll - Handle All Errors

```typescript
import { Effect } from "effect"

const getUser = (id: string): Effect.Effect<User, UserNotFound> => // ...

// Handle any error, must return same success type
const recovered = getUser("123").pipe(
  Effect.catchAll((error) =>
    Effect.succeed({ id: "anonymous", name: "Guest" })
  )
)
// Effect<User, never, never> - error type becomes never
```

### catchTag - Handle Specific Error by Tag

```typescript
import { Effect } from "effect"

const fetchData = (): Effect.Effect<Data, NetworkError | ParseError> => // ...

// Handle only NetworkError
const withRetry = fetchData().pipe(
  Effect.catchTag("NetworkError", (error) =>
    Effect.sync(() => console.log("Retrying...")).pipe(
      Effect.flatMap(() => fetchData())
    )
  )
)
// Effect<Data, ParseError, never> - NetworkError handled

// Handle multiple specific errors
const handled = fetchData().pipe(
  Effect.catchTags({
    NetworkError: (e) => Effect.succeed(defaultData),
    ParseError: (e) => Effect.succeed(emptyData)
  })
)
// Effect<Data, never, never>
```

### catchSome - Handle Conditionally

```typescript
import { Effect, Option } from "effect"

const selective = effect.pipe(
  Effect.catchSome((error) => {
    if (error._tag === "Retryable") {
      return Option.some(retryEffect)
    }
    return Option.none() // Don't handle, propagate
  })
)
```

### orElse - Fallback Effect

```typescript
import { Effect } from "effect"

// If first fails, try second
const withFallback = primarySource().pipe(
  Effect.orElse(() => fallbackSource())
)

// Provide default on failure
const withDefault = effect.pipe(
  Effect.orElseSucceed(() => defaultValue)
)

// Fail with different error
const remapped = effect.pipe(
  Effect.orElseFail(() => new DifferentError())
)
```

### mapError - Transform Error

```typescript
import { Effect } from "effect"

// Transform error type
const wrapped = lowLevelOperation().pipe(
  Effect.mapError((error) => new HighLevelError(error))
)

// Add context to errors
const withContext = dbQuery(sql).pipe(
  Effect.mapError((error) => ({
    ...error,
    query: sql,
    timestamp: Date.now()
  }))
)
```

## Either and Exit

### Using Either

```typescript
import { Effect, Either } from "effect"

// Convert Effect to Either (errors become Left)
const asEither = effect.pipe(Effect.either)
// Effect<Either<E, A>, never, R>

// Handle without short-circuiting
const program = Effect.gen(function* () {
  const result = yield* Effect.either(mayFailEffect)

  if (Either.isLeft(result)) {
    console.log("Failed:", result.left)
    return defaultValue
  }

  return result.right
})
```

### Using Exit

```typescript
import { Effect, Exit } from "effect"

// Get full exit status
const exit = await Effect.runPromiseExit(effect)

if (Exit.isSuccess(exit)) {
  console.log("Success:", exit.value)
} else {
  // Cause contains full error information
  console.log("Failure:", Cause.pretty(exit.cause))
}
```

## Cause - Rich Error Information

Effect tracks not just errors but their full cause:

```typescript
import { Effect, Cause } from "effect"

// Cause types:
// - Fail: Expected error in E channel
// - Die: Unexpected defect
// - Interrupt: Fiber was interrupted
// - Sequential: Multiple causes in sequence
// - Parallel: Multiple causes in parallel

const program = effect.pipe(
  Effect.catchAllCause((cause) => {
    // Full cause tree available
    const failures = Cause.failures(cause) // E[]
    const defects = Cause.defects(cause)   // unknown[]

    // Pretty print
    console.error(Cause.pretty(cause))

    return Effect.succeed(fallback)
  })
)
```

## Retry Patterns

### Basic Retry

```typescript
import { Effect, Schedule } from "effect"

// Retry up to 3 times
const retried = effect.pipe(
  Effect.retry(Schedule.recurs(3))
)

// Retry with delay
const retriedWithDelay = effect.pipe(
  Effect.retry(
    Schedule.recurs(3).pipe(
      Schedule.addDelay(() => "1 second")
    )
  )
)
```

### Exponential Backoff

```typescript
import { Effect, Schedule } from "effect"

const exponentialRetry = effect.pipe(
  Effect.retry(
    Schedule.exponential("100 millis").pipe(
      Schedule.jittered,                    // Add randomness
      Schedule.compose(Schedule.recurs(5)), // Max 5 retries
      Schedule.whileOutput(delay => delay < "30 seconds") // Cap delay
    )
  )
)
```

### Conditional Retry

```typescript
import { Effect, Schedule } from "effect"

// Only retry specific errors
const selectiveRetry = effect.pipe(
  Effect.retry({
    schedule: Schedule.recurs(3),
    while: (error) => error._tag === "Retryable"
  })
)

// Retry until condition
const retryUntilSuccess = effect.pipe(
  Effect.retry({
    schedule: Schedule.spaced("1 second"),
    until: (error) => error._tag === "PermanentFailure"
  })
)
```

## Timeouts

```typescript
import { Effect, Duration } from "effect"

// Fail with TimeoutException after duration
const withTimeout = effect.pipe(
  Effect.timeout(Duration.seconds(30))
)
// Effect<A, E | TimeoutException, R>

// Return Option.none on timeout
const withTimeoutOption = effect.pipe(
  Effect.timeoutOption(Duration.seconds(30))
)
// Effect<Option<A>, E, R>

// Provide fallback on timeout
const withTimeoutFallback = effect.pipe(
  Effect.timeoutFail({
    duration: Duration.seconds(30),
    onTimeout: () => new CustomTimeoutError()
  })
)
```

## Error Accumulation

### Collect All Errors

```typescript
import { Effect } from "effect"

const validations = [
  validateEmail(email),
  validatePassword(password),
  validateAge(age)
]

// Stop at first error (default)
const failFast = Effect.all(validations)

// Collect all errors
const allErrors = Effect.all(validations, { mode: "validate" })
// Effect<[A, B, C], [E, E, E], R>
```

### Custom Error Accumulation

```typescript
import { Effect, Either } from "effect"

const validateForm = Effect.gen(function* () {
  const results = yield* Effect.all([
    Effect.either(validateEmail(email)),
    Effect.either(validatePassword(password)),
    Effect.either(validateAge(age))
  ])

  const errors = results
    .filter(Either.isLeft)
    .map(r => r.left)

  if (errors.length > 0) {
    return yield* Effect.fail(new ValidationErrors(errors))
  }

  return {
    email: (results[0] as Either.Right<string>).right,
    password: (results[1] as Either.Right<string>).right,
    age: (results[2] as Either.Right<number>).right
  }
})
```

## Best Practices

### 1. Use Tagged Error Classes

```typescript
// Good - tagged for catchTag
class UserNotFound extends Error {
  readonly _tag = "UserNotFound" as const
  constructor(readonly userId: string) {
    super(`User not found: ${userId}`)
  }
}

// Avoid - generic errors
const bad = Effect.fail(new Error("User not found"))
```

### 2. Be Specific with Error Types

```typescript
// Good - specific error types
type GetUserError = UserNotFound | DatabaseError | ValidationError

const getUser = (id: string): Effect.Effect<User, GetUserError> => // ...

// Avoid - union with string/Error
const bad = (id: string): Effect.Effect<User, string | Error> => // ...
```

### 3. Handle Errors at Appropriate Level

```typescript
// Low-level: expose specific errors
const queryDb = (sql: string): Effect.Effect<Row[], DbError> => // ...

// Mid-level: wrap and add context
const getUser = (id: string): Effect.Effect<User, UserError> =>
  queryDb(`SELECT * FROM users WHERE id = '${id}'`).pipe(
    Effect.mapError(e => new UserError("Failed to fetch user", e))
  )

// High-level: handle or provide fallback
const getUserOrGuest = (id: string): Effect.Effect<User> =>
  getUser(id).pipe(
    Effect.catchAll(() => Effect.succeed(guestUser))
  )
```

### 4. Use Cause for Debugging

```typescript
const program = effect.pipe(
  Effect.catchAllCause((cause) => {
    // Log full cause for debugging
    console.error(Cause.pretty(cause))

    // But expose clean error to caller
    return Effect.fail(new ServiceUnavailable())
  })
)
```

### 5. Don't Swallow Defects

```typescript
// Good - handle expected errors, let defects propagate
const safe = effect.pipe(
  Effect.catchAll((error) => Effect.succeed(fallback))
)

// Careful - this catches defects too
const dangerous = effect.pipe(
  Effect.catchAllCause((cause) => Effect.succeed(fallback))
)
```
