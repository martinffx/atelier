# Option and Result Types for Type-Safe Error Handling

Option and Result types make error handling and nullable values explicit in function signatures. They force callers to handle failure cases, eliminating null pointer errors and uncaught exceptions.

## Option Type

Option represents "a value that may be absent." It's an explicit alternative to `null` or `undefined`.

### Definition

```typescript
type None = { _tag: "None" }
type Some<T> = { _tag: "Some"; value: T }
type Option<T> = None | Some<T>

const None: None = { _tag: "None" }
const Some = <T>(value: T): Option<T> => ({ _tag: "Some", value })
```

### Basic Usage

```typescript
function findUser(id: string): Option<User> {
  const user = database.get(id)
  return user ? Some(user) : None
}

const result = findUser("123")
switch (result._tag) {
  case "Some":
    console.log(`Found user: ${result.value.name}`)
    break
  case "None":
    console.log("User not found")
    break
}
```

### When to Use Option

Use Option when:
- A value may legitimately be absent
- Absence is an expected, valid outcome (not an error)
- You want to chain operations that may not find values
- You want to make nullability explicit in APIs

**Example scenarios:**
- Finding a user by ID (may not exist)
- Getting a value from a map
- First/last element of an array
- Parsing optional configuration fields

### Option Utilities

```typescript
// Check variant
const isNone = <T>(opt: Option<T>): opt is None => opt._tag === "None"
const isSome = <T>(opt: Option<T>): opt is Some<T> => opt._tag === "Some"

// Get value or default
const getOrElse = <T>(opt: Option<T>, defaultValue: T): T =>
  opt._tag === "Some" ? opt.value : defaultValue

// Transform value if present
const map = <T, U>(opt: Option<T>, fn: (value: T) => U): Option<U> =>
  opt._tag === "Some" ? Some(fn(opt.value)) : None

// Chain optional operations
const flatMap = <T, U>(opt: Option<T>, fn: (value: T) => Option<U>): Option<U> =>
  opt._tag === "Some" ? fn(opt.value) : None

// Filter value based on predicate
const filter = <T>(opt: Option<T>, predicate: (value: T) => boolean): Option<T> =>
  opt._tag === "Some" && predicate(opt.value) ? opt : None

// Convert to array (for iteration)
const toArray = <T>(opt: Option<T>): T[] =>
  opt._tag === "Some" ? [opt.value] : []
```

### Option Examples

#### Configuration Parsing

```typescript
type Config = {
  port: number
  host: string
  logLevel: Option<string> // Optional field
  maxConnections: Option<number>
}

function parseConfig(raw: unknown): Config {
  const data = raw as any
  return {
    port: data.port,
    host: data.host,
    logLevel: data.logLevel ? Some(data.logLevel) : None,
    maxConnections: data.maxConnections ? Some(data.maxConnections) : None,
  }
}

const config = parseConfig({ port: 3000, host: "localhost" })

// Use getOrElse for defaults
const logLevel = getOrElse(config.logLevel, "info")
const maxConnections = getOrElse(config.maxConnections, 100)
```

#### Chaining Operations

```typescript
type User = { id: string; name: string; email: string }
type Profile = { bio: string; avatar: string }

function findUser(id: string): Option<User> {
  // ...
}

function getProfile(user: User): Option<Profile> {
  // ...
}

// Chain without nested if statements
const profile = flatMap(findUser("123"), getProfile)

switch (profile._tag) {
  case "Some":
    console.log(profile.value.bio)
    break
  case "None":
    console.log("Profile not found")
    break
}
```

#### Array Operations

```typescript
function first<T>(arr: T[]): Option<T> {
  return arr.length > 0 ? Some(arr[0]) : None
}

function last<T>(arr: T[]): Option<T> {
  return arr.length > 0 ? Some(arr[arr.length - 1]) : None
}

const numbers = [1, 2, 3, 4, 5]
const firstNum = first(numbers) // Some(1)
const lastNum = last(numbers)   // Some(5)

const empty: number[] = []
const noFirst = first(empty)    // None
```

## Result Type

Result represents "an operation that may fail with an error." It makes errors explicit in function signatures and forces error handling.

### Definition

```typescript
type Ok<T> = { _tag: "Ok"; value: T }
type Err<E> = { _tag: "Err"; error: E }
type Result<T, E> = Ok<T> | Err<E>

const Ok = <T>(value: T): Result<T, never> => ({ _tag: "Ok", value })
const Err = <E>(error: E): Result<never, E> => ({ _tag: "Err", error })
```

### Basic Usage

```typescript
type ParseError = { field: string; message: string }

function parsePort(raw: unknown): Result<number, ParseError> {
  if (typeof raw !== "number") {
    return Err({ field: "port", message: "must be number" })
  }
  if (raw < 1 || raw > 65535) {
    return Err({ field: "port", message: "must be 1-65535" })
  }
  return Ok(raw)
}

const result = parsePort(3000)
switch (result._tag) {
  case "Ok":
    console.log(`Port: ${result.value}`)
    break
  case "Err":
    console.error(`Error in ${result.error.field}: ${result.error.message}`)
    break
}
```

### When to Use Result

Use Result when:
- An operation may fail with recoverable errors
- You need to propagate error context (not just "failed")
- You want errors in function signatures (self-documenting)
- You want to avoid try/catch for expected failures

**Example scenarios:**
- Parsing/validating user input
- Network requests
- File I/O operations
- Business rule validation

### Result Utilities

```typescript
// Check variant
const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result._tag === "Ok"
const isErr = <T, E>(result: Result<T, E>): result is Err<E> => result._tag === "Err"

// Get value or throw
const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result._tag === "Ok") return result.value
  throw new Error(`Unwrap failed: ${JSON.stringify(result.error)}`)
}

// Get value or default
const getOrElse = <T, E>(result: Result<T, E>, defaultValue: T): T =>
  result._tag === "Ok" ? result.value : defaultValue

// Transform success value
const map = <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> =>
  result._tag === "Ok" ? Ok(fn(result.value)) : result

// Transform error
const mapErr = <T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> =>
  result._tag === "Err" ? Err(fn(result.error)) : result

// Chain operations that return Result
const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> =>
  result._tag === "Ok" ? fn(result.value) : result

// Combine multiple Results
const all = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  const values: T[] = []
  for (const result of results) {
    if (result._tag === "Err") return result
    values.push(result.value)
  }
  return Ok(values)
}
```

### Result Examples

#### Configuration Validation

```typescript
type ConfigError = { field: string; message: string }

function parsePort(raw: unknown): Result<number, ConfigError> {
  if (typeof raw !== "number") {
    return Err({ field: "port", message: "must be number" })
  }
  if (raw < 1 || raw > 65535) {
    return Err({ field: "port", message: "must be 1-65535" })
  }
  return Ok(raw)
}

function parseHost(raw: unknown): Result<string, ConfigError> {
  if (typeof raw !== "string") {
    return Err({ field: "host", message: "must be string" })
  }
  if (raw.length === 0) {
    return Err({ field: "host", message: "cannot be empty" })
  }
  return Ok(raw)
}

type Config = { port: number; host: string }

function parseConfig(raw: unknown): Result<Config, ConfigError> {
  const data = raw as any

  const portResult = parsePort(data.port)
  if (portResult._tag === "Err") return portResult

  const hostResult = parseHost(data.host)
  if (hostResult._tag === "Err") return hostResult

  return Ok({ port: portResult.value, host: hostResult.value })
}

// Usage
const configResult = parseConfig({ port: 3000, host: "localhost" })
switch (configResult._tag) {
  case "Ok":
    startServer(configResult.value)
    break
  case "Err":
    console.error(`Config error in ${configResult.error.field}: ${configResult.error.message}`)
    process.exit(1)
}
```

#### Chaining Operations

```typescript
type DbError = { kind: "not_found" } | { kind: "connection_error"; message: string }

function findUser(id: string): Result<User, DbError> {
  // ...
}

function updateUser(user: User, updates: Partial<User>): Result<User, DbError> {
  // ...
}

// Chain without nested if statements
const result = flatMap(
  findUser("123"),
  (user) => updateUser(user, { name: "Alice" })
)

switch (result._tag) {
  case "Ok":
    console.log(`Updated user: ${result.value.name}`)
    break
  case "Err":
    if (result.error.kind === "not_found") {
      console.error("User not found")
    } else {
      console.error(`Connection error: ${result.error.message}`)
    }
    break
}
```

#### HTTP Request Handling

```typescript
type HttpError =
  | { kind: "network"; message: string }
  | { kind: "timeout" }
  | { kind: "server"; statusCode: number }
  | { kind: "parse"; message: string }

async function fetchUser(id: string): Promise<Result<User, HttpError>> {
  try {
    const response = await fetch(`/api/users/${id}`)

    if (!response.ok) {
      return Err({ kind: "server", statusCode: response.status })
    }

    const data = await response.json()
    return Ok(data as User)
  } catch (e) {
    if (e instanceof SyntaxError) {
      return Err({ kind: "parse", message: e.message })
    }
    return Err({ kind: "network", message: String(e) })
  }
}

// Usage
const userResult = await fetchUser("123")
switch (userResult._tag) {
  case "Ok":
    renderUser(userResult.value)
    break
  case "Err":
    switch (userResult.error.kind) {
      case "network":
        showError("Network error, please try again")
        break
      case "timeout":
        showError("Request timed out")
        break
      case "server":
        showError(`Server error: ${userResult.error.statusCode}`)
        break
      case "parse":
        showError("Invalid response from server")
        break
    }
    break
}
```

#### Accumulating Multiple Errors

```typescript
type ValidationError = { field: string; message: string }

function validateEmail(email: string): Result<string, ValidationError> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Err({ field: "email", message: "invalid email format" })
  }
  return Ok(email)
}

function validatePassword(password: string): Result<string, ValidationError> {
  if (password.length < 8) {
    return Err({ field: "password", message: "must be at least 8 characters" })
  }
  return Ok(password)
}

type SignupForm = { email: string; password: string }

function validateSignup(form: SignupForm): Result<SignupForm, ValidationError[]> {
  const errors: ValidationError[] = []

  const emailResult = validateEmail(form.email)
  if (emailResult._tag === "Err") {
    errors.push(emailResult.error)
  }

  const passwordResult = validatePassword(form.password)
  if (passwordResult._tag === "Err") {
    errors.push(passwordResult.error)
  }

  if (errors.length > 0) {
    return Err(errors)
  }

  return Ok(form)
}
```

## Option vs Result vs Exceptions

### Decision Guide

| Scenario | Use |
|----------|-----|
| Value may be absent (expected) | Option |
| Operation may fail (recoverable) | Result |
| Programmer error (bug) | Exception |

### Examples

```typescript
// Option: Value may be absent
function findUser(id: string): Option<User>

// Result: Operation may fail
function parseConfig(raw: string): Result<Config, ParseError>

// Exception: Programmer error
function unreachable(message: string): never {
  throw new Error(`Unreachable: ${message}`)
}
```

### When to Use Exceptions

Use exceptions for:
- Programmer errors (bugs)
- Assertion failures
- Unrecoverable errors
- Contract violations

```typescript
function assertNever(x: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(x)}`)
}

function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error("Division by zero") // Programmer error
  }
  return a / b
}
```

## Converting Between Types

### Option to Result

```typescript
function optionToResult<T, E>(opt: Option<T>, error: E): Result<T, E> {
  return opt._tag === "Some" ? Ok(opt.value) : Err(error)
}

// Usage
const user = findUser("123")
const result = optionToResult(user, { kind: "not_found" })
```

### Result to Option

```typescript
function resultToOption<T, E>(result: Result<T, E>): Option<T> {
  return result._tag === "Ok" ? Some(result.value) : None
}

// Usage
const configResult = parseConfig(rawConfig)
const config = resultToOption(configResult) // Discard error details
```

### Null/Undefined to Option

```typescript
function fromNullable<T>(value: T | null | undefined): Option<T> {
  return value != null ? Some(value) : None
}

// Usage
const maybePort = fromNullable(process.env.PORT)
```

## Best Practices

1. **Make errors explicit in signatures**: `Result<T, E>` tells callers what can fail
2. **Use specific error types**: Don't use `string` or `Error` as error type
3. **Combine with discriminated unions**: Error variants should be tagged unions
4. **Avoid nested Results**: Use `flatMap` to chain operations
5. **Don't mix Option and null**: Choose one approach per codebase
6. **Use utilities for common patterns**: Don't rewrite `map`, `flatMap`, etc.
7. **Document when to use exceptions**: Reserve for programmer errors

## Common Patterns

### Early Return with Result

```typescript
function processOrder(orderId: string): Result<Order, OrderError> {
  const orderResult = findOrder(orderId)
  if (orderResult._tag === "Err") return orderResult

  const paymentResult = processPayment(orderResult.value)
  if (paymentResult._tag === "Err") return mapErr(paymentResult, toOrderError)

  const shipmentResult = createShipment(orderResult.value)
  if (shipmentResult._tag === "Err") return mapErr(shipmentResult, toOrderError)

  return Ok(orderResult.value)
}
```

### Combining Multiple Results

```typescript
function validateAll<T>(
  validators: ((value: T) => Result<T, string>)[]
): (value: T) => Result<T, string[]> {
  return (value) => {
    const errors: string[] = []

    for (const validator of validators) {
      const result = validator(value)
      if (result._tag === "Err") {
        errors.push(result.error)
      }
    }

    return errors.length > 0 ? Err(errors) : Ok(value)
  }
}
```

### Safe Property Access with Option

```typescript
function getProp<T, K extends keyof T>(obj: T, key: K): Option<T[K]> {
  const value = obj[key]
  return value !== undefined ? Some(value) : None
}

// Usage
type Config = { port?: number }
const config: Config = {}
const port = getProp(config, "port") // Option<number>
```

## Further Reading

- [ADTs](./adts.md) - Algebraic Data Types and discriminated unions
- [Branded Types](./branded-types.md) - Smart constructors and nominal typing
- [Migration Guide](./migration-guide.md) - Step-by-step adoption playbook
